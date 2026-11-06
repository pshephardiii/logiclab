import { assignmentLearningPolicySchema } from '@logiclab/contracts';
import type { AssignmentAttempt as AttemptEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { StudentWorkError } from '../../application/student-work/errors';

export function policyFor(assignment: {
  assessmentMode: string;
  feedbackTiming: string;
  solutionAccess: string;
}) {
  const policy = assignmentLearningPolicySchema.safeParse({
    assessmentMode: assignment.assessmentMode,
    feedbackTiming: assignment.feedbackTiming,
    solutionAccess: assignment.solutionAccess,
  });

  if (!policy.success) throw new StudentWorkError('unsupported_policy');

  return policy.data;
}

export function checkRevision(attempt: AttemptEntity, revision: number) {
  if (attempt.revision !== revision) throw new StudentWorkError('revision_conflict');
}
