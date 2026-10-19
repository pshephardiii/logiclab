import { JobExecutionError } from './errors';
import type { JobStore } from '../../persistence/jobs/types';
import type { JobClaim, JobDefinition, JobOutcome, JobRegistry } from './types';

function batchLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Cycle limit must be an integer between 1 and 100.');
  return limit;
}

/** Safe for external automation to invoke once; no in-process recurring timer is started. */
export async function runSchedulerCycle(store: JobStore, limit = 20) {
  return { scheduled: await store.scheduleDue(batchLimit(limit)) };
}

async function execute(claim: JobClaim, definition: JobDefinition): Promise<JobOutcome> {
  if (!definition.handler) return { ok: false, code: 'HANDLER_UNAVAILABLE' };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const task = Promise.resolve()
      .then(() =>
        definition.handler!({ jobId: claim.id, attempt: claim.attempt, signal: controller.signal }),
      )
      .then(
        (result) => ({ ok: true as const, result }),
        (error) => ({
          ok: false as const,
          code: error instanceof JobExecutionError ? error.code : ('HANDLER_FAILED' as const),
        }),
      );
    const deadline = new Promise<JobOutcome>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve({ ok: false, code: 'EXECUTION_TIMEOUT' });
      }, definition.timeoutSeconds * 1000);
    });
    return await Promise.race([task, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Recover and process bounded work. Handler execution occurs after claim has committed. */
export async function runWorkerCycle(store: JobStore, registry: JobRegistry, limit = 10) {
  batchLimit(limit);
  const results = {
    recovered: await store.recoverExpired(limit),
    claimed: 0,
    succeeded: 0,
    retry: 0,
    failed: 0,
    stale: 0,
  };
  for (let index = 0; index < limit; index += 1) {
    const claim = await store.claim();
    if (!claim) break;
    results.claimed += 1;
    // A finalization database failure propagates; a later cycle recovers the unfinalized lease.
    const outcome = await execute(claim, registry[claim.jobType]);
    const status = await store.finish(claim, outcome);
    results[status] += 1;
  }
  return results;
}
