import type { AssignmentAttempt as AttemptEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { StudentAttempt } from '@logiclab/contracts';

export function attemptResponse(attempt: AttemptEntity): StudentAttempt {
  return {
    id: attempt.id,
    revision: attempt.revision,
    answers: attempt.answers,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    result: attempt.submittedAt ? (attempt.result ?? null) : null,
  };
}
