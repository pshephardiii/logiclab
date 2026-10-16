import { MikroORM } from '@mikro-orm/postgresql';
import { databaseOptions } from './config.ts';

export { User, UserRole } from './entities/User.ts';
export { AuthSession } from './entities/AuthSession.ts';
export { databaseOptions } from './config.ts';

/** Caller closes the ORM on shutdown; use a forked EntityManager per request/job. */
export async function createDatabase(
  connectionString: string,
  options: { snapshotOnMigrate?: boolean; schema?: string } = {},
) {
  return MikroORM.init(databaseOptions(connectionString, options));
}

export { Classroom } from './entities/Classroom.ts';
export { Enrollment } from './entities/Enrollment.ts';
export { LockMode } from '@mikro-orm/core';

export { Problem } from './entities/Problem.ts';
export { ProblemVersion } from './entities/ProblemVersion.ts';
export type { ProblemDefinition } from './types/problem/definition.ts';

export { Assignment } from './entities/Assignment.ts';
export { AssignmentItem } from './entities/AssignmentItem.ts';

export type { AssignmentFields } from './types/assignment/fields.ts';

export { AssessmentMode, FeedbackTiming } from './types/assignment/enums.ts';

export { ProblemType } from './types/problem/enums.ts';
export type { UserFields } from './types/user/fields.ts';
export type { AuthSessionFields } from './types/auth-session/fields.ts';
export type { ClassroomFields } from './types/classroom/fields.ts';
export type { EnrollmentFields } from './types/enrollment/fields.ts';
export type { ProblemFields } from './types/problem/fields.ts';
export type { ProblemVersionFields } from './types/problem-version/fields.ts';
export type { AssignmentItemFields } from './types/assignment-item/fields.ts';

export { AssignmentAttempt } from './entities/AssignmentAttempt.ts';
export type { AssignmentAttemptFields } from './types/assignment-attempt/fields.ts';
export type {
  AttemptAnswer,
  AttemptAnswers,
  SubmissionResult,
} from './types/assignment-attempt/work.ts';
