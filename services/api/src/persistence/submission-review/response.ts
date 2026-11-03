import type { AssignmentAttempt } from '@logiclab/db' with { 'resolution-mode': 'import' };
import {
  assignmentScoreSchema,
  assignmentResponsesSchema,
  submissionSummarySchema,
  submissionResultSchema,
  type SubmissionSummary,
  type StudentAttempt,
} from '@logiclab/contracts';
import { AssignmentOperationError } from '../../application/assignment/errors';

/** Caller authorizes the owner and loads the student relation; draft work is never exposed. */
export function submissionSummary(attempt: AssignmentAttempt): SubmissionSummary {
  if (!attempt.submittedAt || !attempt.result) throw new AssignmentOperationError('not_found');
  return submissionSummarySchema.parse({
    id: attempt.id,
    student: { id: attempt.student.id, email: attempt.student.email ?? null },
    submittedAt: attempt.submittedAt.toISOString(),
    summary: attempt.result.summary,
    ...(attempt.score ? { score: assignmentScoreSchema.parse(attempt.score) } : {}),
  });
}

/** Authorized instructor review includes frozen results independently of student grade release. */
export function objectiveReviewAttempt(attempt: AssignmentAttempt): StudentAttempt {
  return {
    id: attempt.id,
    revision: attempt.revision,
    answers: assignmentResponsesSchema.parse(attempt.answers),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    result: attempt.result ? submissionResultSchema.parse(attempt.result) : null,
    ...(attempt.score ? { score: assignmentScoreSchema.parse(attempt.score) } : {}),
    gradePending: false,
  };
}
