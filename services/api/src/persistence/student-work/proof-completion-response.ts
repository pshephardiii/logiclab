import type { Assignment, AssignmentAttempt } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { proofCompletionSubmissionResultSchema } from '@logiclab/contracts/proof-submission';
import { StudentWorkError } from '../../application/student-work/errors';

/** Inspect retained data, never rerun verification or convert completion into a grade. */
export function retainedProofCompletion(attempt: AssignmentAttempt, assignment: Assignment) {
  if (
    !attempt.submittedAt ||
    assignment.assessmentMode !== 'completion_only' ||
    attempt.score != null
  )
    throw new StudentWorkError('unsupported_policy');
  return proofCompletionSubmissionResultSchema.parse(attempt.result);
}
