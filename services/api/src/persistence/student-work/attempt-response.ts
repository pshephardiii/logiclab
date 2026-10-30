import { StudentWorkError } from '../../application/student-work/errors';
import { assignmentScoreSchema } from '@logiclab/contracts';
import type { Assignment, AssignmentAttempt as AttemptEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { StudentAttempt } from '@logiclab/contracts';
import { canViewAssignmentResults } from '../../application/assignment/results-release';

/** Student projection only: never serialize retained grades before their independent release. */
export function attemptResponse(attempt: AttemptEntity, assignment: Assignment): StudentAttempt {
  const submitted = Boolean(attempt.submittedAt);
  if (submitted && assignment.scoringVersion && !attempt.score)
    throw new StudentWorkError('unsupported_policy');
  const visible =
    assignment.assessmentMode === 'graded'
      ? canViewAssignmentResults({
          assessmentMode: 'graded',
          submitted,
          gradeReleaseTiming: assignment.gradeReleaseTiming,
          gradesReleased: Boolean(assignment.gradesReleasedAt),
        })
      : canViewAssignmentResults({ assessmentMode: assignment.assessmentMode, submitted });
  return {
    id: attempt.id,
    revision: attempt.revision,
    answers: attempt.answers,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    result: visible ? (attempt.result ?? null) : null,
    ...(assignment.scoringVersion
      ? { score: visible && attempt.score ? assignmentScoreSchema.parse(attempt.score) : null }
      : {}),
    gradePending: submitted && assignment.assessmentMode === 'graded' && !visible,
  };
}
