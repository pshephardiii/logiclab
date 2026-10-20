import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { nextScheduledTime, scheduledOccurrenceKey } from '../../application/jobs/scheduling';
import type { JobRegistry } from '../../application/jobs/types';
import type { JobStore } from './types';
import { databaseTime } from '../database-time';

/** One due occurrence per schedule per cycle; skip missed slots while preserving interval alignment. */
export async function createScheduleStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  registry: JobRegistry,
): Promise<Pick<JobStore, 'setupSchedule' | 'enqueue' | 'scheduleDue'>> {
  const { JobSchedule, DurableJob, LockMode } = await import('@logiclab/db');
  return {
    async setupSchedule(jobType) {
      const definition = registry[jobType];
      if (!definition) throw new Error('Unsupported job type.');
      return orm.em.fork().transactional(async (em) => {
        const now = await databaseTime(em);
        await em.upsert(
          JobSchedule,
          {
            id: randomUUID(),
            name: jobType,
            jobType,
            enabled: false,
            intervalSeconds: definition.defaultIntervalSeconds,
            maxAttempts: definition.maxAttempts,
            nextRunAt: new Date(now.getTime() + definition.defaultIntervalSeconds * 1000),
          },
          { onConflictFields: ['name'], onConflictAction: 'ignore' },
        );
        const schedule = await em.findOneOrFail(JobSchedule, { name: jobType }, { refresh: true });
        if (schedule.jobType !== jobType)
          throw new Error('Schedule name conflicts with another job type.');
        return schedule.id;
      });
    },
    async enqueue(jobType, deduplicationKey) {
      if (!registry[jobType] || !deduplicationKey.trim() || deduplicationKey.length > 255)
        throw new Error('Invalid job request.');
      return orm.em.fork().transactional(async (em) => {
        await em.upsert(
          DurableJob,
          {
            id: randomUUID(),
            jobType,
            deduplicationKey,
            maxAttempts: registry[jobType].maxAttempts,
            availableAt: await databaseTime(em),
          },
          { onConflictFields: ['jobType', 'deduplicationKey'], onConflictAction: 'ignore' },
        );
        return (
          await em.findOneOrFail(DurableJob, { jobType, deduplicationKey }, { refresh: true })
        ).id;
      });
    },
    async scheduleDue(limit) {
      return orm.em.fork().transactional(async (em) => {
        const now = await databaseTime(em);
        const schedules = await em.find(
          JobSchedule,
          { enabled: true, nextRunAt: { $lte: now } },
          {
            limit,
            orderBy: { nextRunAt: 'ASC', id: 'ASC' },
            lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
          },
        );
        for (const schedule of schedules) {
          if (!registry[schedule.jobType]) throw new Error('Unsupported scheduled job.');
          const occurrence = schedule.nextRunAt;
          await em.upsert(
            DurableJob,
            {
              id: randomUUID(),
              jobType: schedule.jobType,
              schedule,
              scheduledFor: occurrence,
              deduplicationKey: scheduledOccurrenceKey(schedule.id, occurrence),
              maxAttempts: schedule.maxAttempts,
              availableAt: now,
            },
            { onConflictFields: ['schedule', 'scheduledFor'], onConflictAction: 'ignore' },
          );
          schedule.nextRunAt = nextScheduledTime(occurrence, schedule.intervalSeconds, now);
        }
        await em.flush();
        return schedules.length;
      });
    },
  };
}
