import { MikroORM } from '@mikro-orm/postgresql';
import { databaseOptions } from './config.js';

export { User, UserRole } from './entities/User.js';
export { AuthSession } from './entities/AuthSession.js';
export { databaseOptions } from './config.js';

/** Caller closes the ORM on shutdown; use a forked EntityManager per request/job. */
export async function createDatabase(
  connectionString: string,
  options: { snapshotOnMigrate?: boolean; schema?: string } = {},
) {
  return MikroORM.init(databaseOptions(connectionString, options));
}

export { Classroom } from './entities/Classroom.js';
export { Enrollment } from './entities/Enrollment.js';
export { LockMode } from '@mikro-orm/core';

export { Problem } from './entities/Problem.js';
export { ProblemVersion } from './entities/ProblemVersion.js';
export type { ProblemDefinition } from './types/problem/definition.js';

export { Assignment } from './entities/Assignment.js';
export { AssignmentItem } from './entities/AssignmentItem.js';

export type { AssignmentFields } from './types/assignment/fields.js';

export { AssessmentMode, FeedbackTiming } from './types/assignment/enums.js';

export { ProblemType } from './types/problem/enums.js';
export type { UserFields } from './types/user/fields.js';
export type { AuthSessionFields } from './types/auth-session/fields.js';
export type { ClassroomFields } from './types/classroom/fields.js';
export type { EnrollmentFields } from './types/enrollment/fields.js';
export type { ProblemFields } from './types/problem/fields.js';
export type { ProblemVersionFields } from './types/problem-version/fields.js';
export type { AssignmentItemFields } from './types/assignment-item/fields.js';
