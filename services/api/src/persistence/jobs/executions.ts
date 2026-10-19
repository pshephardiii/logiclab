import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobRegistry } from '../../application/jobs/types';
import { failureTransition } from '../../application/jobs/execution-policy';
import { validResult } from '../../application/jobs/result-validation';
import type { JobStore } from './types';
import { databaseTime } from './database-time';

/** Short row-locking transactions only; handlers never run inside these transactions. */
export async function createExecutionStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  registry: JobRegistry,
): Promise<Pick<JobStore, 'recoverExpired' | 'claim' | 'finish'>> {
  const { DurableJob, JobRun, ReconciliationFinding, JobStatus, JobRunStatus, LockMode } =
    await import('@logiclab/db');
  return {
    async recoverExpired(limit) {
      return orm.em.fork().transactional(async (em) => {
        const now = await databaseTime(em);
        const jobs = await em.find(
          DurableJob,
          { status: JobStatus.Running, leaseExpiresAt: { $lte: now } },
          {
            limit,
            orderBy: { leaseExpiresAt: 'ASC', id: 'ASC' },
            lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
          },
        );
        for (const job of jobs) {
          const run = await em.findOneOrFail(JobRun, {
            job: job.id,
            leaseToken: job.leaseToken!,
            status: JobRunStatus.Running,
          });
          run.status = JobRunStatus.LeaseExpired;
          run.finishedAt = now;
          run.errorCode = 'LEASE_EXPIRED';
          const transition = failureTransition(
            job.attempts,
            job.maxAttempts,
            registry[job.jobType],
            now,
          );
          job.status = transition.exhausted ? JobStatus.Failed : JobStatus.Queued;
          job.completedAt = transition.completedAt;
          job.availableAt = transition.availableAt;
          job.leaseToken = undefined;
          job.leaseExpiresAt = undefined;
        }
        await em.flush();
        return jobs.length;
      });
    },
    async claim() {
      return orm.em.fork().transactional(async (em) => {
        const eligibleAt = await databaseTime(em);
        const job = await em.findOne(
          DurableJob,
          { status: JobStatus.Queued, availableAt: { $lte: eligibleAt } },
          {
            orderBy: { availableAt: 'ASC', id: 'ASC' },
            lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
          },
        );
        if (!job) return null;
        const policy = registry[job.jobType];
        if (!policy) throw new Error('Unsupported queued job.');
        const now = await databaseTime(em);
        job.status = JobStatus.Running;
        job.attempts += 1;
        job.leaseToken = randomUUID();
        job.leaseExpiresAt = new Date(now.getTime() + policy.leaseSeconds * 1000);
        em.persist(
          em.create(JobRun, {
            job,
            attempt: job.attempts,
            leaseToken: job.leaseToken,
            startedAt: now,
          }),
        );
        await em.flush();
        return {
          id: job.id,
          jobType: job.jobType,
          attempt: job.attempts,
          leaseToken: job.leaseToken,
        };
      });
    },
    async finish(claim, outcome) {
      return orm.em.fork().transactional(async (em) => {
        const job = await em.findOne(DurableJob, claim.id, {
          lockMode: LockMode.PESSIMISTIC_WRITE,
        });
        const now = await databaseTime(em);
        if (
          !job ||
          job.status !== JobStatus.Running ||
          job.leaseToken !== claim.leaseToken ||
          job.attempts !== claim.attempt ||
          !job.leaseExpiresAt ||
          job.leaseExpiresAt <= now
        )
          return 'stale' as const;
        const run = await em.findOneOrFail(JobRun, {
          job: job.id,
          leaseToken: claim.leaseToken,
          status: JobRunStatus.Running,
        });
        const checked =
          outcome.ok && !validResult(outcome.result)
            ? { ok: false as const, code: 'INVALID_RESULT' as const }
            : outcome;
        run.finishedAt = now;
        if (checked.ok) {
          for (const finding of checked.result.findings) {
            await em.upsert(
              ReconciliationFinding,
              {
                id: randomUUID(),
                job,
                kind: finding.kind,
                purchaseId: finding.purchaseId,
                classId: finding.classId,
                grantId: finding.grantId,
                detectedAt: now,
              },
              { onConflictFields: ['job', 'kind', 'purchaseId'], onConflictAction: 'ignore' },
            );
          }
          run.status = JobRunStatus.Succeeded;
          run.recordsChecked = checked.result.recordsChecked;
          run.findingsCount = await em.count(ReconciliationFinding, { job: job.id });
          job.status = JobStatus.Succeeded;
          job.completedAt = now;
        } else {
          run.status = JobRunStatus.Failed;
          run.errorCode = checked.code;
          const transition = failureTransition(
            job.attempts,
            job.maxAttempts,
            registry[job.jobType],
            now,
          );
          job.status = transition.exhausted ? JobStatus.Failed : JobStatus.Queued;
          job.completedAt = transition.completedAt;
          job.availableAt = transition.availableAt;
        }
        job.leaseToken = undefined;
        job.leaseExpiresAt = undefined;
        await em.flush();
        return checked.ok
          ? ('succeeded' as const)
          : job.status === JobStatus.Failed
            ? ('failed' as const)
            : ('retry' as const);
      });
    },
  };
}
