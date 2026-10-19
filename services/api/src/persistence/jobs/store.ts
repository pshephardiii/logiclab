import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobRegistry } from '../../application/jobs/types';
import { createScheduleStore } from './schedules';
import { createExecutionStore } from './executions';
import type { JobStore } from './types';

export async function createJobStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  registry: JobRegistry,
): Promise<JobStore> {
  return {
    ...(await createScheduleStore(orm, registry)),
    ...(await createExecutionStore(orm, registry)),
  };
}
