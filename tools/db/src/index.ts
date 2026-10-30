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
export type {
  ProblemDefinition,
  TruthTableDefinition,
  TrueFalseDefinition,
  MultipleChoiceDefinition,
  ConceptualProblemDefinition,
} from './types/problem/definition.ts';

export { Assignment } from './entities/Assignment.ts';
export { AssignmentItem } from './entities/AssignmentItem.ts';

export type { AssignmentFields } from './types/assignment/fields.ts';

export {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
  GradeReleaseTiming,
  AssignmentScoringVersion,
} from './types/assignment/enums.ts';

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
export type {
  ConceptualResponse,
  AssignmentResponses,
  MixedGradedSubmissionResult,
  MixedCompletionSubmissionResult,
} from './types/assignment-attempt/mixed-work.ts';

export { ClassPurchase } from './entities/ClassPurchase.ts';
export type { ClassPurchaseFields } from './types/class-purchase/fields.ts';

export { ClassEntitlement } from './entities/ClassEntitlement.ts';
export type { ClassEntitlementFields } from './types/class-entitlement/fields.ts';

export { PaymentEvent } from './entities/PaymentEvent.ts';
export type { PaymentEventFields } from './types/payment-event/fields.ts';

export { PurchaseStatus } from './types/class-purchase/enums.ts';
export { EntitlementSource, ClassCapability } from './types/class-entitlement/enums.ts';

export { BillingProvider } from './types/billing/enums.ts';

export { BillingPlan } from './entities/BillingPlan.ts';
export type { BillingPlanFields } from './types/billing-plan/fields.ts';
export { BillingModel, BillingInterval } from './types/billing-plan/enums.ts';

export { JobSchedule } from './entities/JobSchedule.ts';
export type { JobScheduleFields } from './types/job-schedule/fields.ts';

export { DurableJob } from './entities/DurableJob.ts';
export type { DurableJobFields } from './types/durable-job/fields.ts';

export { JobRun } from './entities/JobRun.ts';
export type { JobRunFields } from './types/job-run/fields.ts';

export { ReconciliationFinding } from './entities/ReconciliationFinding.ts';
export type { ReconciliationFindingFields } from './types/reconciliation-finding/fields.ts';
export { JobType } from './types/job-schedule/enums.ts';
export { JobStatus } from './types/durable-job/enums.ts';
export { JobRunStatus } from './types/job-run/enums.ts';
export { FindingKind } from './types/reconciliation-finding/enums.ts';

export { DemoWorkspace } from './entities/DemoWorkspace.ts';
export { DemoWorkspaceStatus } from './types/demo-workspace/enums.ts';
export type { DemoWorkspaceFields } from './types/demo-workspace/fields.ts';

export { UserIdentityProvider } from './types/user/enums.ts';
export { DemoSession } from './entities/DemoSession.ts';
export type { DemoSessionFields } from './types/demo-session/fields.ts';

export { seedDemoBillingPlan } from './seeds/billing-plan.ts';

export type { AssignmentItemScore, AssignmentScore } from './types/assignment-attempt/scoring.ts';
