import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
export type DatabaseManager = Awaited<ReturnType<typeof createDatabase>>['em'];

/** Wall-clock time sampled inside the transaction, including time spent waiting for a lock. */
export async function databaseTime(em: DatabaseManager): Promise<Date> {
  const rows = await em.execute<{ now: Date }[]>('select clock_timestamp() as now');
  return new Date(rows[0]!.now);
}
