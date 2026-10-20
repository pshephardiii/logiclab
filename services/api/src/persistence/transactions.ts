import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
export type Database = Awaited<ReturnType<typeof createDatabase>>;
export type DatabaseManager = Database['em'];

/** Join an explicitly supplied transaction, or own a fresh transaction for ordinary operations. */
export function transactionRunner(orm: Database, manager?: DatabaseManager) {
  return async <T>(work: (em: DatabaseManager) => Promise<T>): Promise<T> => {
    if (manager) {
      if (!manager.isInTransaction()) throw new Error('An active transaction is required.');
      return work(manager);
    }
    return orm.em.fork().transactional(work);
  };
}
