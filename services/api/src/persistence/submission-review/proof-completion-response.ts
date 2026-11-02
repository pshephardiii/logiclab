import type { Assignment, AssignmentAttempt } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { retainedProofCompletion } from '../student-work/proof-completion-response';
import { savedStudentResponsesSchema } from '@logiclab/contracts/saved-student-work';

/** Owner projection. Caller must authorize the assignment owner and load the related student. */
export function proofCompletionReviewSummary(attempt: AssignmentAttempt, assignment: Assignment) {
  const result = retainedProofCompletion(attempt, assignment);
  return {
    id: attempt.id,
    student: { id: attempt.student.id, email: attempt.student.email ?? null },
    submittedAt: attempt.submittedAt!.toISOString(),
    summary: result.summary,
  };
}

export function proofCompletionReviewResponse(attempt: AssignmentAttempt, assignment: Assignment) {
  const result = retainedProofCompletion(attempt, assignment);
  const submittedAt = attempt.submittedAt!.toISOString();
  return {
    submission: proofCompletionReviewSummary(attempt, assignment),
    attempt: {
      id: attempt.id,
      revision: attempt.revision,
      answers: savedStudentResponsesSchema.parse(attempt.answers),
      submittedAt,
      result,
      gradePending: false,
    },
  };
}
