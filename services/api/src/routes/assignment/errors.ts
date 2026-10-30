import { mapProblemDefinitionError } from '../problem-definition-error';
import { AssignmentOperationError } from '../../application/assignment/errors';
import { mapAuthError } from '../auth/errors';

export class AssignmentError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const failures = {
  invalid_scoring: {
    status: 400,
    code: 'ASSIGNMENT_SCORING_INVALID',
    message:
      'Point scoring requires graded work and valid points for every problem. Update problem order and points together.',
  },
  release_unavailable: {
    status: 409,
    code: 'ASSIGNMENT_RELEASE_UNAVAILABLE',
    message: 'This assignment does not support the requested release action.',
  },
  invalid_policy: {
    status: 400,
    code: 'ASSIGNMENT_POLICY_INVALID',
    message: 'The combined assignment learning policy is invalid.',
  },
  coverage_required: {
    status: 409,
    code: 'CLASS_COVERAGE_REQUIRED',
    message:
      'Active class coverage is required to publish a new assignment. Existing published work remains available.',
  },
  not_found: {
    status: 404,
    code: 'ASSIGNMENT_NOT_FOUND',
    message: 'Assignment or classroom not found.',
  },
  version_not_found: {
    status: 404,
    code: 'PROBLEM_VERSION_NOT_FOUND',
    message: 'A selected problem version was not found.',
  },
  published: {
    status: 409,
    code: 'ASSIGNMENT_PUBLISHED',
    message: 'Published assignment content and policy cannot be edited.',
  },
  archived: {
    status: 409,
    code: 'ASSIGNMENT_ARCHIVED',
    message: 'Restore this assignment before editing or publishing.',
  },
  empty: {
    status: 409,
    code: 'ASSIGNMENT_EMPTY',
    message: 'Add at least one published problem before publishing.',
  },
};
export function mapAssignmentError(error: unknown) {
  const unsupported = mapProblemDefinitionError(error);
  if (unsupported) return unsupported;
  if (error instanceof AssignmentError)
    return { status: error.status, code: error.code, message: error.message };
  if (error instanceof AssignmentOperationError) return failures[error.reason];
  const mapped = mapAuthError(error);
  return mapped.status === 503
    ? {
        status: 503,
        code: 'ASSIGNMENT_UNAVAILABLE',
        message: 'Assignments are temporarily unavailable. Please try again.',
      }
    : mapped;
}
