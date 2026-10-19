import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
export type JobManager = Awaited<ReturnType<typeof createDatabase>>['em'];

/** Wall-clock time sampled inside the transaction, including time spent waiting for a lock. */
export async function databaseTime(em: JobManager): Promise<Date> {
  const rows = await em.execute<{ now: Date }[]>('select clock_timestamp() as now');
  return new Date(rows[0]!.now);
}
