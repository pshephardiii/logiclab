import { AuthError } from '../../application/auth/service';
import { errorName } from '../helpers/errors';

/** Suppress account-discovery details in resend and recovery responses. */
export const hiddenAccountErrors = new Set([
  'UserNotFoundException',
  'NotAuthorizedException',
  'InvalidParameterException',
  'UsernameExistsException',
]);

/** Classify errors in precedence order without HTTP side effects. */
export function mapAuthError(error: unknown, routeUrl?: string) {
  let status = 503;
  let code = 'AUTH_UNAVAILABLE';
  let text = 'Authentication is temporarily unavailable. Please try again.';
  const name = errorName(error);
  const authCode = error instanceof AuthError ? error.code : '';
  if (error instanceof Error && error.message === 'AUTH_ORIGIN_REJECTED') {
    status = 403;
    code = 'ORIGIN_REJECTED';
    text = 'This request origin is not allowed.';
  } else if (authCode === 'INVALID_REQUEST' || (error instanceof Error && 'validation' in error)) {
    status = 400;
    code = 'INVALID_REQUEST';
    text = 'Check the supplied fields and try again.';
  } else if (
    routeUrl === '/api/auth/reset-password' &&
    [
      'UserNotFoundException',
      'NotAuthorizedException',
      'CodeMismatchException',
      'ExpiredCodeException',
      'InvalidPasswordException',
      'InvalidParameterException',
      'PasswordHistoryPolicyViolationException',
    ].includes(name)
  ) {
    status = 400;
    code = 'CONFIRMATION_FAILED';
    text = 'Check your code and password, or request a new code.';
  } else if (
    authCode.startsWith('SESSION_') ||
    ['EMAIL_NOT_VERIFIED', 'ACCOUNT_NOT_PROVISIONED'].includes(authCode) ||
    name === 'NotAuthorizedException' ||
    name === 'UserNotFoundException' ||
    name === 'UserNotConfirmedException'
  ) {
    status = 401;
    code = 'AUTH_REQUIRED';
    text = 'Sign in with a confirmed account or check your credentials.';
  } else if (
    [
      'CodeMismatchException',
      'ExpiredCodeException',
      'InvalidPasswordException',
      'InvalidParameterException',
      'PasswordHistoryPolicyViolationException',
    ].includes(name)
  ) {
    status = 400;
    code = 'CONFIRMATION_FAILED';
    text = 'Check your code and password, or request a new code.';
  } else if (
    name === 'TooManyRequestsException' ||
    name === 'LimitExceededException' ||
    (error instanceof Error && 'statusCode' in error && error.statusCode === 429)
  ) {
    status = 429;
    code = 'RATE_LIMITED';
    text = 'Too many requests. Please try again later.';
  } else if (
    error instanceof Error &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    [400, 413, 415].includes(error.statusCode)
  ) {
    status = error.statusCode;
    code = 'INVALID_REQUEST';
    text = 'Provide a valid, bounded JSON request.';
  }
  return {
    status,
    code,
    message: text,
    logCode: authCode === 'SIGNUP_RECONCILIATION_REQUIRED' ? authCode : code,
  };
}
