import { AuthError } from '../../application/auth/service';
import { errorName } from '../helpers/errors';
import { ClassroomError } from './helpers';

/** Classify errors in precedence order without HTTP side effects. */
export function mapClassroomError(error: unknown) {
  let status = 503,
    code = 'CLASSROOM_UNAVAILABLE',
    message = 'Classes are temporarily unavailable. Please try again.';
  if (error instanceof ClassroomError) {
    status = error.status;
    code = error.code;
    message = error.message;
  } else if (
    (error instanceof AuthError && error.code === 'INVALID_REQUEST') ||
    (error instanceof Error && 'validation' in error)
  ) {
    status = 400;
    code = 'INVALID_REQUEST';
    message = 'Check the supplied fields and try again.';
  } else if (error instanceof AuthError && error.code.startsWith('SESSION_')) {
    status = 401;
    code = 'AUTH_REQUIRED';
    message = 'Please sign in again.';
  } else if (error instanceof Error && error.message === 'AUTH_ORIGIN_REJECTED') {
    status = 403;
    code = 'ORIGIN_REJECTED';
    message = 'This request origin is not allowed.';
  } else if (
    (error instanceof Error &&
      ['NotAuthorizedException', 'UserNotFoundException'].includes(errorName(error))) ||
    (error instanceof AuthError &&
      ['EMAIL_NOT_VERIFIED', 'ACCOUNT_NOT_PROVISIONED'].includes(error.code))
  ) {
    status = 401;
    code = 'AUTH_REQUIRED';
    message = 'Please sign in again.';
  } else if (
    error instanceof Error &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    [400, 413, 415, 429].includes(error.statusCode)
  ) {
    status = error.statusCode;
    code = status === 429 ? 'RATE_LIMITED' : 'INVALID_REQUEST';
    message =
      status === 429
        ? 'Too many requests. Please try again later.'
        : 'Provide a valid, bounded JSON request.';
  }
  return { status, code, message };
}
