import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  type createDatabase,
  JobSchedule,
  DurableJob,
  JobRun,
  ReconciliationFinding,
  JobType,
  JobStatus,
  JobRunStatus,
  FindingKind,
} from '../src/index.ts';

/** Registered by the database suite so migrations run once before these transactional tests. */
export function registerJobPersistenceTests(orm: Awaited<ReturnType<typeof createDatabase>>) {
  type Manager = typeof orm.em;
  async function fixture(em: Manager) {
    const schedule = em.create(JobSchedule, {
      name: `billing-${randomUUID()}`,
      jobType: JobType.BillingReconciliation,
      intervalSeconds: 3600,
      nextRunAt: new Date(),
    });
    const job = em.create(DurableJob, {
      jobType: schedule.jobType,
      schedule,
      scheduledFor: schedule.nextRunAt,
      deduplicationKey: randomUUID(),
    });
    const run = em.create(JobRun, { job, attempt: 1, leaseToken: randomUUID() });
    const finding = em.create(ReconciliationFinding, {
      job,
      kind: FindingKind.RefundedPurchaseActiveGrant,
      purchaseId: randomUUID(),
      classId: randomUUID(),
      grantId: randomUUID(),
    });
    em.persist([schedule, job, run, finding]);
    await em.flush();
    return { schedule, job, run, finding };
  }
  function transactionalTest(name: string, check: (em: Manager) => Promise<void>) {
    test(name, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        await check(em);
      } finally {
        await em.rollback();
      }
    });
  }
  transactionalTest(
    'job persistence separates disabled schedules, manual requests, attempts, and findings',
    async (em) => {
      const { schedule, job, run, finding } = await fixture(em);
      const manual = em.create(DurableJob, {
        jobType: JobType.BillingReconciliation,
        deduplicationKey: randomUUID(),
      });
      em.persist(manual);
      await em.flush();
      em.clear();
      const savedSchedule = await em.findOneOrFail(JobSchedule, schedule.id);
      assert.equal(savedSchedule.enabled, false);
      assert.equal(savedSchedule.maxAttempts, 3);
      assert(savedSchedule.nextRunAt instanceof Date);
      const saved = await em.findOneOrFail(DurableJob, job.id);
      assert.equal(saved.status, JobStatus.Queued);
      assert.equal(saved.attempts, 0);
      assert.equal(saved.leaseToken ?? null, null);
      assert.equal((await em.findOneOrFail(DurableJob, manual.id)).schedule ?? null, null);
      assert.equal((await em.findOneOrFail(JobRun, run.id)).status, JobRunStatus.Running);
      assert.equal(
        (await em.findOneOrFail(ReconciliationFinding, finding.id)).purchaseId,
        finding.purchaseId,
      );
    },
  );
  for (const duplicate of [
    'schedule',
    'occurrence',
    'request',
    'attempt',
    'lease',
    'finding',
  ] as const) {
    transactionalTest(`job uniqueness rejects duplicate ${duplicate}`, async (em) => {
      const { schedule, job, run, finding } = await fixture(em);
      const constraints = {
        schedule: 'job_schedules_name_unique',
        occurrence: 'durable_jobs_schedule_occurrence_unique',
        request: 'durable_jobs_type_key_unique',
        attempt: 'job_runs_job_attempt_unique',
        lease: 'job_runs_lease_unique',
        finding: 'reconciliation_findings_job_kind_purchase_unique',
      };
      if (duplicate === 'schedule')
        em.persist(
          em.create(JobSchedule, {
            name: schedule.name,
            jobType: schedule.jobType,
            intervalSeconds: 3600,
            nextRunAt: new Date(),
          }),
        );
      if (duplicate === 'occurrence')
        em.persist(
          em.create(DurableJob, {
            jobType: job.jobType,
            schedule,
            scheduledFor: job.scheduledFor,
            deduplicationKey: randomUUID(),
          }),
        );
      if (duplicate === 'request')
        em.persist(
          em.create(DurableJob, { jobType: job.jobType, deduplicationKey: job.deduplicationKey }),
        );
      if (duplicate === 'attempt')
        em.persist(em.create(JobRun, { job, attempt: run.attempt, leaseToken: randomUUID() }));
      if (duplicate === 'lease')
        em.persist(em.create(JobRun, { job, attempt: 2, leaseToken: run.leaseToken }));
      if (duplicate === 'finding')
        em.persist(
          em.create(ReconciliationFinding, {
            job,
            kind: finding.kind,
            purchaseId: finding.purchaseId,
            classId: finding.classId,
            grantId: randomUUID(),
          }),
        );
      await assert.rejects(em.flush(), new RegExp(constraints[duplicate]));
    });
  }
  for (const invalid of [
    'schedule_interval',
    'schedule_attempts',
    'job_type',
    'occurrence_pair',
    'attempt_bounds',
    'unleased_running',
    'leased_queued',
    'unfinished_success',
    'exhausted_queue',
    'run_state',
    'run_time',
    'counts',
    'finding_kind',
  ] as const) {
    transactionalTest(`job constraints reject ${invalid}`, async (em) => {
      const { schedule, job, run, finding } = await fixture(em);
      const operations = {
        schedule_interval: () => em.nativeUpdate(JobSchedule, schedule.id, { intervalSeconds: 0 }),
        schedule_attempts: () => em.nativeUpdate(JobSchedule, schedule.id, { maxAttempts: 11 }),
        job_type: () => em.nativeUpdate(DurableJob, job.id, { jobType: 'unsupported' as JobType }),
        occurrence_pair: () => em.nativeUpdate(DurableJob, job.id, { scheduledFor: null }),
        attempt_bounds: () => em.nativeUpdate(DurableJob, job.id, { attempts: -1 }),
        unleased_running: () =>
          em.nativeUpdate(DurableJob, job.id, { status: JobStatus.Running, attempts: 1 }),
        leased_queued: () =>
          em.nativeUpdate(DurableJob, job.id, {
            leaseToken: randomUUID(),
            leaseExpiresAt: new Date(),
          }),
        unfinished_success: () =>
          em.nativeUpdate(DurableJob, job.id, { status: JobStatus.Succeeded, attempts: 1 }),
        exhausted_queue: () => em.nativeUpdate(DurableJob, job.id, { attempts: 3 }),
        run_state: () => em.nativeUpdate(JobRun, run.id, { status: JobRunStatus.Failed }),
        run_time: () =>
          em.nativeUpdate(JobRun, run.id, {
            status: JobRunStatus.Succeeded,
            finishedAt: new Date(run.startedAt.getTime() - 1000),
          }),
        counts: () => em.nativeUpdate(JobRun, run.id, { recordsChecked: -1 }),
        finding_kind: () =>
          em.nativeUpdate(ReconciliationFinding, finding.id, {
            kind: 'unsupported' as FindingKind,
          }),
      };
      const constraints = {
        schedule_interval: 'job_schedules_interval_check',
        schedule_attempts: 'job_schedules_attempts_check',
        job_type: 'durable_jobs_type_check',
        occurrence_pair: 'durable_jobs_occurrence_check',
        attempt_bounds: 'durable_jobs_attempts_check',
        unleased_running: 'durable_jobs_state_check',
        leased_queued: 'durable_jobs_state_check',
        unfinished_success: 'durable_jobs_state_check',
        exhausted_queue: 'durable_jobs_state_check',
        run_state: 'job_runs_state_check',
        run_time: 'job_runs_finished_check',
        counts: 'job_runs_counts_check',
        finding_kind: 'reconciliation_findings_kind_check',
      };
      await assert.rejects(operations[invalid](), new RegExp(constraints[invalid]));
    });
  }
  transactionalTest(
    'job records support retry and completion without discarding attempt history',
    async (em) => {
      const { job, run } = await fixture(em);
      job.status = JobStatus.Running;
      job.attempts = 1;
      job.leaseToken = run.leaseToken;
      job.leaseExpiresAt = new Date(Date.now() + 60000);
      await em.flush();
      run.status = JobRunStatus.LeaseExpired;
      run.finishedAt = new Date();
      run.errorCode = 'LEASE_EXPIRED';
      job.status = JobStatus.Queued;
      job.leaseToken = undefined;
      job.leaseExpiresAt = undefined;
      job.availableAt = new Date(Date.now() + 30000);
      await em.flush();
      const retry = em.create(JobRun, { job, attempt: 2, leaseToken: randomUUID() });
      job.status = JobStatus.Running;
      job.attempts = 2;
      job.leaseToken = retry.leaseToken;
      job.leaseExpiresAt = new Date(Date.now() + 60000);
      em.persist(retry);
      await em.flush();
      retry.status = JobRunStatus.Succeeded;
      retry.finishedAt = new Date();
      retry.recordsChecked = 10;
      retry.findingsCount = 1;
      job.status = JobStatus.Succeeded;
      job.leaseToken = undefined;
      job.leaseExpiresAt = undefined;
      job.completedAt = new Date();
      await em.flush();
      em.clear();
      assert.equal(await em.count(JobRun, { job: job.id }), 2);
      assert.equal((await em.findOneOrFail(JobRun, run.id)).status, JobRunStatus.LeaseExpired);
      assert.equal((await em.findOneOrFail(DurableJob, job.id)).status, JobStatus.Succeeded);
    },
  );
  for (const parent of ['schedule', 'job'] as const) {
    transactionalTest(`job history restricts deleting its ${parent}`, async (em) => {
      const { schedule, job } = await fixture(em);
      await assert.rejects(
        parent === 'schedule'
          ? em.nativeDelete(JobSchedule, schedule.id)
          : em.nativeDelete(DurableJob, job.id),
        /_fkey/,
      );
    });
  }
}
