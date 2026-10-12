import { MikroORM } from '@mikro-orm/postgresql';
import { databaseOptions } from './config.js';

export { User, UserRole, UserSchema } from './entities/User.js';
export { AuthSession, AuthSessionSchema } from './entities/AuthSession.js';
export { databaseOptions } from './config.js';

/** Caller closes the ORM on shutdown; use a forked EntityManager per request/job. */
export async function createDatabase(connectionString: string, options: { snapshotOnMigrate?: boolean } = {}) {
  return MikroORM.init(databaseOptions(connectionString, options));
}
