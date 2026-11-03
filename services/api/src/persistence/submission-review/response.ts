import { validateProofSubmissionScore } from '../../application/assignment/proof-scoring';
import { releasedGradingFields } from './grading-state';
import { savedStudentAttemptSchema } from '@logiclab/contracts/saved-student-work';
import type { SubmissionGradingResponse } from '@logiclab/contracts';
import type { AssignmentAttempt } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { submissionSummarySchema, type SubmissionSummary } from '@logiclab/contracts';
import { AssignmentOperationError } from '../../application/assignment/errors';

/** Caller authorizes the owner and loads the student relation; draft work is never exposed. */
export function submissionSummary(
  attempt: AssignmentAttempt,
  grading?: SubmissionGradingResponse,
): SubmissionSummary {
  if (!attempt.submittedAt || !attempt.result) throw new AssignmentOperationError('not_found');
  if (attempt.result.gradingVersion === 'proof_mixed_v1')
    validateProofSubmissionScore(attempt.result, attempt.score);
  return submissionSummarySchema.parse({
    id: attempt.id,
    student: { id: attempt.student.id, email: attempt.student.email ?? null },
    submittedAt: attempt.submittedAt.toISOString(),
    summary: attempt.result.summary,
    ...(attempt.score ? { score: releasedGradingFields(attempt.score, grading).score } : {}),
  });
}

/** Frozen automatic reports remain intact; instructor awards are a separate released projection. */
export function finalReviewAttempt(
  attempt: AssignmentAttempt,
  grading?: SubmissionGradingResponse,
) {
  return savedStudentAttemptSchema.parse({
    id: attempt.id,
    revision: attempt.revision,
    answers: attempt.answers,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    result: attempt.result,
    ...(attempt.score ? releasedGradingFields(attempt.score, grading) : {}),
    gradePending: false,
  });
}
