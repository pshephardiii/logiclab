import { releasedGradingFields } from '../submission-review/grading-state';
import type { SubmissionGradingResponse } from '@logiclab/contracts';
import { validateProofSubmissionScore } from '../../application/assignment/proof-scoring';
import { retainedProofCompletion } from './proof-completion-response';
import { StudentWorkError } from '../../application/student-work/errors';
import { assignmentScoreSchema } from '@logiclab/contracts';
import type { Assignment, AssignmentAttempt as AttemptEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import {
  savedStudentAttemptSchema,
  type SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';
import { canViewAssignmentResults } from '../../application/assignment/results-release';

/** Student projection only: never serialize retained grades before their independent release. */
export function attemptResponse(
  attempt: AttemptEntity,
  assignment: Assignment,
  grading?: SubmissionGradingResponse,
): SavedStudentAttempt {
  const submitted = Boolean(attempt.submittedAt);

  if (submitted && assignment.assessmentMode === 'graded' && !attempt.score)
    throw new StudentWorkError('unsupported_policy');

  if (
    attempt.result?.gradingVersion === 'proof_mixed_v1' &&
    (!submitted || assignment.assessmentMode !== 'graded')
  )
    throw new StudentWorkError('unsupported_policy');

  if (attempt.result?.gradingVersion === 'proof_completion_v1')
    retainedProofCompletion(attempt, assignment);

  const score =
    attempt.result?.gradingVersion === 'proof_mixed_v1'
      ? validateProofSubmissionScore(attempt.result, attempt.score)
      : attempt.score
        ? assignmentScoreSchema.parse(attempt.score)
        : null;

  const visible =
    assignment.assessmentMode === 'graded'
      ? canViewAssignmentResults({
          assessmentMode: 'graded',
          submitted,
          gradeReleaseTiming: assignment.gradeReleaseTiming,
          gradesReleased: Boolean(assignment.gradesReleasedAt),
        })
      : canViewAssignmentResults({ assessmentMode: assignment.assessmentMode, submitted });

  return savedStudentAttemptSchema.parse({
    id: attempt.id,
    revision: attempt.revision,
    answers: attempt.answers,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    result: visible ? (attempt.result ?? null) : null,
    ...(assignment.assessmentMode === 'graded'
      ? visible && score
        ? releasedGradingFields(score, grading)
        : { score: null }
      : {}),
    gradePending: submitted && assignment.assessmentMode === 'graded' && !visible,
  });
}
