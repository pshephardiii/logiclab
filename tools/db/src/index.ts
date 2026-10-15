import { MikroORM } from '@mikro-orm/postgresql';
import { databaseOptions } from './config.js';

export { User, UserRole } from './entities/User.js';
export { AuthSession } from './entities/AuthSession.js';
export { databaseOptions } from './config.js';

/** Caller closes the ORM on shutdown; use a forked EntityManager per request/job. */
export async function createDatabase(
  connectionString: string,
  options: { snapshotOnMigrate?: boolean } = {},
) {
  return MikroORM.init(databaseOptions(connectionString, options));
}

export { Classroom } from './entities/Classroom.js';
export { Enrollment } from './entities/Enrollment.js';
export { LockMode } from '@mikro-orm/core';

export { Problem } from './entities/Problem.js';
export { ProblemVersion } from './entities/ProblemVersion.js';
export type { ProblemDefinition } from './types/problem-definition.js';
