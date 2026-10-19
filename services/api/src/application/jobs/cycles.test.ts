import { retryDelaySeconds } from './execution-policy';
import { JobExecutionError } from './errors';
import type { JobType } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobStore } from '../../persistence/jobs/types';
import { runSchedulerCycle, runWorkerCycle } from './cycles';
import { createJobRegistry } from './registry';
import type { JobClaim, JobHandler } from './types';

const type = 'billing_reconciliation' as JobType;
const claim: JobClaim = { id: 'job', jobType: type, attempt: 1, leaseToken: 'lease' };
function fixture(handler?: JobHandler) {
  const registry = createJobRegistry(handler ? { billing_reconciliation: handler } : {});
  const store = {
    setupSchedule: jest.fn(),
    enqueue: jest.fn(),
    scheduleDue: jest.fn(async () => 2),
    recoverExpired: jest.fn(async () => 1),
    claim: jest
      .fn<Promise<JobClaim | null>, []>()
      .mockResolvedValueOnce(claim)
      .mockResolvedValue(null),
    finish: jest
      .fn<ReturnType<JobStore['finish']>, Parameters<JobStore['finish']>>()
      .mockResolvedValue('succeeded'),
  };
  return { registry, store };
}

test('scheduler cycle delegates a bounded batch without starting a timer', async () => {
  const { store } = fixture();
  expect(await runSchedulerCycle(store)).toEqual({ scheduled: 2 });
  expect(store.scheduleDue).toHaveBeenCalledWith(20);
});

test.each([0, -1, 101, 1.5])('rejects invalid cycle limits %s', async (limit) => {
  const { store, registry } = fixture();
  await expect(runSchedulerCycle(store, limit)).rejects.toThrow('Cycle limit');
  await expect(runWorkerCycle(store, registry, limit)).rejects.toThrow('Cycle limit');
  expect(store.recoverExpired).not.toHaveBeenCalled();
});

test('worker recovers before claiming, passes execution context, and reports persisted outcomes', async () => {
  const handler = jest.fn(async () => ({ recordsChecked: 3, findings: [] }));
  const { store, registry } = fixture(handler);
  expect(await runWorkerCycle(store, registry)).toEqual({
    recovered: 1,
    claimed: 1,
    succeeded: 1,
    retry: 0,
    failed: 0,
    stale: 0,
  });
  expect(store.recoverExpired.mock.invocationCallOrder[0]).toBeLessThan(
    store.claim.mock.invocationCallOrder[0]!,
  );
  expect(handler).toHaveBeenCalledWith({
    jobId: claim.id,
    attempt: 1,
    signal: expect.any(AbortSignal),
  });
  expect(store.finish).toHaveBeenCalledWith(claim, {
    ok: true,
    result: { recordsChecked: 3, findings: [] },
  });
});

test('handler exceptions are sanitized and missing handlers never succeed', async () => {
  const { store, registry } = fixture(async () => {
    throw new Error('private database details');
  });
  store.finish.mockResolvedValue('retry');
  await runWorkerCycle(store, registry);
  expect(store.finish).toHaveBeenCalledWith(claim, { ok: false, code: 'HANDLER_FAILED' });
  const missing = fixture();
  missing.store.finish.mockResolvedValue('retry');
  await runWorkerCycle(missing.store, missing.registry);
  expect(missing.store.finish).toHaveBeenCalledWith(claim, {
    ok: false,
    code: 'HANDLER_UNAVAILABLE',
  });
});

test('timed-out execution is aborted and late resolution cannot finalize again', async () => {
  jest.useFakeTimers();
  let finishHandler!: (result: { recordsChecked: number; findings: [] }) => void;
  let signal: AbortSignal | undefined;
  try {
    const { store, registry } = fixture((context) => {
      signal = context.signal;
      return new Promise((resolve) => {
        finishHandler = resolve;
      });
    });
    store.finish.mockResolvedValue('retry');
    const pending = runWorkerCycle(store, registry, 1);
    await jest.advanceTimersByTimeAsync(45000);
    expect((await pending).retry).toBe(1);
    expect(signal!.aborted).toBe(true);
    expect(store.finish).toHaveBeenCalledWith(claim, { ok: false, code: 'EXECUTION_TIMEOUT' });
    finishHandler({ recordsChecked: 0, findings: [] });
    await Promise.resolve();
    expect(store.finish).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test('database finalization failures propagate for later lease recovery', async () => {
  const { store, registry } = fixture(async () => ({ recordsChecked: 0, findings: [] }));
  store.finish.mockRejectedValue(new Error('database unavailable'));
  await expect(runWorkerCycle(store, registry)).rejects.toThrow('database unavailable');
  expect(store.finish).toHaveBeenCalledTimes(1);
});

test('per-type defaults and bounded retry delays are explicit', () => {
  const definition = createJobRegistry()[type];
  expect(definition.defaultIntervalSeconds).toBe(3600);
  expect(definition.timeoutSeconds).toBeLessThan(definition.leaseSeconds);
  expect([1, 2, 3, 10].map((attempt) => retryDelaySeconds(attempt, definition))).toEqual([
    30, 60, 120, 900,
  ]);
});

test('explicit reconciliation failure codes are preserved without error messages', async () => {
  const { store, registry } = fixture(async () => {
    throw new JobExecutionError('RECONCILIATION_SCAN_LIMIT');
  });
  store.finish.mockResolvedValue('retry');
  await runWorkerCycle(store, registry);
  expect(store.finish).toHaveBeenCalledWith(claim, {
    ok: false,
    code: 'RECONCILIATION_SCAN_LIMIT',
  });
});
