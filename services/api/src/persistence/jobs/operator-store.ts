import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobPage } from './types';
import { jobSummary, scheduleSummary, runSummary, findingSummary } from './operator-response';
import { databaseTime } from '../database-time';

function pageNext(length: number, page: JobPage) {
  return length > page.limit ? page.offset + page.limit : null;
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
          runs: runs.map(runSummary),
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
        findings: rows.slice(0, page.limit).map(findingSummary),
        nextOffset: pageNext(rows.length, page),
      };
    },
  };
}
export type JobOperatorStore = Awaited<ReturnType<typeof createJobOperatorStore>>;
