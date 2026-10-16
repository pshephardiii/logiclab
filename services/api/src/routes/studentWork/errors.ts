import { StudentWorkError } from '../../application/student-work/errors';
import { mapAuthError } from '../auth/errors';

export class StudentWorkRouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const failures = {
  not_found: {
    status: 404,
    code: 'ASSIGNMENT_NOT_FOUND',
    message: 'Assignment or item not found.',
  },
  revision_conflict: {
    status: 409,
    code: 'ATTEMPT_REVISION_CONFLICT',
    message: 'This work changed. Reload the saved attempt before trying again.',
  },
  submitted: {
    status: 409,
    code: 'ATTEMPT_SUBMITTED',
    message: 'Final submissions cannot be edited.',
  },
  solution_locked: {
    status: 403,
    code: 'SOLUTION_UNAVAILABLE',
    message: 'Solutions are unavailable for this work.',
  },
  invalid_cell: {
    status: 400,
    code: 'INVALID_CELL',
    message: 'Answers must reference an answer cell in the assigned table.',
  },
  duplicate_cell: {
    status: 400,
    code: 'DUPLICATE_CELL',
    message: 'Save each answer cell at most once.',
  },
  unsupported_policy: {
    status: 409,
    code: 'ASSIGNMENT_POLICY_UNSUPPORTED',
    message: 'This assignment policy is not supported.',
  },
};
export function mapStudentWorkError(error: unknown) {
  if (error instanceof StudentWorkRouteError)
    return { status: error.status, code: error.code, message: error.message };
  if (error instanceof StudentWorkError) return failures[error.reason];
  const mapped = mapAuthError(error);
  return mapped.status === 503
    ? {
        status: 503,
        code: 'STUDENT_WORK_UNAVAILABLE',
        message: 'Student work is temporarily unavailable. Please try again.',
      }
    : mapped;
}
