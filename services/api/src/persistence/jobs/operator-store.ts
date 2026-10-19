import type {
  createDatabase,
  DurableJob as JobEntity,
  JobSchedule as ScheduleEntity,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import { databaseTime } from './database-time';

export interface JobPage {
  offset: number;
  limit: number;
}
function pageNext(length: number, page: JobPage) {
  return length > page.limit ? page.offset + page.limit : null;
}
function jobSummary(job: JobEntity) {
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    scheduleId: job.schedule?.id ?? null,
    scheduledFor: job.scheduledFor?.toISOString() ?? null,
    availableAt: job.availableAt.toISOString(),
    leaseExpiresAt: job.leaseExpiresAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}
function scheduleSummary(schedule: ScheduleEntity) {
  return {
    id: schedule.id,
    name: schedule.name,
    jobType: schedule.jobType,
    enabled: schedule.enabled,
    intervalSeconds: schedule.intervalSeconds,
    maxAttempts: schedule.maxAttempts,
    nextRunAt: schedule.nextRunAt.toISOString(),
  };
}
export class JobOperatorError extends Error {}

/** Operator-only inspection/configuration. Never expose these methods through instructor routes. */
export async function createJobOperatorStore(orm: Awaited<ReturnType<typeof createDatabase>>) {
  const { JobSchedule, DurableJob, JobRun, ReconciliationFinding, LockMode } =
    await import('@logiclab/db');
  return {
    async schedules(page: JobPage) {
      const rows = await orm.em
        .fork()
        .find(
          JobSchedule,
          {},
          { limit: page.limit + 1, offset: page.offset, orderBy: { name: 'ASC', id: 'ASC' } },
        );
      return {
        schedules: rows.slice(0, page.limit).map(scheduleSummary),
        nextOffset: pageNext(rows.length, page),
      };
    },
    async setEnabled(id: string, enabled: boolean) {
      return orm.em.fork().transactional(async (em) => {
        const schedule = await em.findOne(JobSchedule, id, {
          lockMode: LockMode.PESSIMISTIC_WRITE,
        });
        if (!schedule) throw new JobOperatorError('Schedule not found.');
        schedule.enabled = enabled;
        // Preserve nextRunAt: resuming an overdue schedule uses the normal bounded catch-up rule.
        await em.flush();
        return { schedule: scheduleSummary(schedule) };
      });
    },
    async jobs(page: JobPage) {
      const rows = await orm.em.fork().find(
        DurableJob,
        {},
        {
          limit: page.limit + 1,
          offset: page.offset,
          orderBy: { createdAt: 'DESC', id: 'DESC' },
        },
      );
      return {
        jobs: rows.slice(0, page.limit).map(jobSummary),
        nextOffset: pageNext(rows.length, page),
      };
    },
    async inspect(id: string) {
      return orm.em.fork().transactional(async (em) => {
        await em.execute('set transaction isolation level repeatable read read only');
        const now = await databaseTime(em);
        const job = await em.findOne(DurableJob, id);
        if (!job) throw new JobOperatorError('Job not found.');
        const runs = await em.find(JobRun, { job: id }, { orderBy: { attempt: 'ASC' }, limit: 10 });
        return {
          job: jobSummary(job),
          leaseExpired: Boolean(job.leaseExpiresAt && job.leaseExpiresAt <= now),
          findingCount: await em.count(ReconciliationFinding, { job: id }),
          runs: runs.map((run) => ({
            id: run.id,
            attempt: run.attempt,
            status: run.status,
            startedAt: run.startedAt.toISOString(),
            finishedAt: run.finishedAt?.toISOString() ?? null,
            errorCode: run.errorCode ?? null,
            recordsChecked: run.recordsChecked,
            findingsCount: run.findingsCount,
          })),
        };
      });
    },
    async findings(id: string, page: JobPage) {
      const em = orm.em.fork();
      if (!(await em.findOne(DurableJob, id))) throw new JobOperatorError('Job not found.');
      const rows = await em.find(
        ReconciliationFinding,
        { job: id },
        {
          limit: page.limit + 1,
          offset: page.offset,
          orderBy: { kind: 'ASC', purchaseId: 'ASC', id: 'ASC' },
        },
      );
      return {
        jobId: id,
        findings: rows.slice(0, page.limit).map((row) => ({
          id: row.id,
          kind: row.kind,
          purchaseId: row.purchaseId,
          classId: row.classId,
          grantId: row.grantId ?? null,
          detectedAt: row.detectedAt.toISOString(),
        })),
        nextOffset: pageNext(rows.length, page),
      };
    },
  };
}
export type JobOperatorStore = Awaited<ReturnType<typeof createJobOperatorStore>>;
