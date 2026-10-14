import { installAccountHttpPolicy } from '../account-http';
import type { FastifyInstance } from 'fastify';
import { authErrorResponseSchema } from '@logiclab/contracts';
import { AuthError } from '../../application/auth/service';
import { clearSessionCookie } from './cookies';
import type { AuthContext } from './context';
import { errorName } from '../helpers/errors';
import { postSignupRoute } from './postSignup/route';
import { postConfirmRoute } from './postConfirm/route';
import { postResendRoute } from './postResend/route';
import { postLoginRoute } from './postLogin/route';
import { getSessionRoute } from './getSession/route';
import { postLogoutRoute } from './postLogout/route';
import { postForgotPasswordRoute } from './postForgotPassword/route';
import { postResetPasswordRoute } from './postResetPassword/route';

/**
 * Registers account endpoints with scoped HTTP policy and sanitized authentication error responses.
 */
export async function authRoutes(app: FastifyInstance, context: AuthContext) {
  await installAccountHttpPolicy(app, context.config, {
    global: true,
    keyGenerator: request => request.ip,
  });
  app.setErrorHandler((error, request, reply) => {
    let status = 503; let code = 'AUTH_UNAVAILABLE'; let text = 'Authentication is temporarily unavailable. Please try again.';
    const name = errorName(error);
    const authCode = error instanceof AuthError ? error.code : '';
    if (error instanceof Error && error.message === 'AUTH_ORIGIN_REJECTED') {
      status = 403; code = 'ORIGIN_REJECTED'; text = 'This request origin is not allowed.';
    } else if (authCode === 'INVALID_REQUEST' || error instanceof Error && 'validation' in error) {
      status = 400; code = 'INVALID_REQUEST'; text = 'Check the supplied fields and try again.';
    } else if (request.routeOptions.url === '/api/auth/reset-password' && ['UserNotFoundException', 'NotAuthorizedException', 'CodeMismatchException', 'ExpiredCodeException', 'InvalidPasswordException', 'InvalidParameterException', 'PasswordHistoryPolicyViolationException'].includes(name)) {
      status = 400; code = 'CONFIRMATION_FAILED'; text = 'Check your code and password, or request a new code.';
    } else if (authCode.startsWith('SESSION_') || ['EMAIL_NOT_VERIFIED', 'ACCOUNT_NOT_PROVISIONED'].includes(authCode) || name === 'NotAuthorizedException' || name === 'UserNotFoundException' || name === 'UserNotConfirmedException') {
      status = 401; code = 'AUTH_REQUIRED'; text = 'Sign in with a confirmed account or check your credentials.';
    } else if (['CodeMismatchException', 'ExpiredCodeException', 'InvalidPasswordException', 'InvalidParameterException', 'PasswordHistoryPolicyViolationException'].includes(name)) {
      status = 400; code = 'CONFIRMATION_FAILED'; text = 'Check your code and password, or request a new code.';
    } else if (name === 'TooManyRequestsException' || name === 'LimitExceededException' || (error instanceof Error && 'statusCode' in error && error.statusCode === 429)) {
      status = 429; code = 'RATE_LIMITED'; text = 'Too many requests. Please try again later.';
    } else if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' && [400, 413, 415].includes(error.statusCode)) {
      status = error.statusCode; code = 'INVALID_REQUEST'; text = 'Provide a valid, bounded JSON request.';
    }
    if (status === 401 && request.routeOptions.url === '/api/auth/session') clearSessionCookie(reply, context.config);
    // Do not log SDK error messages/stacks, request bodies, email addresses, or tokens.
    if (status === 503) request.log.warn({ code: authCode === 'SIGNUP_RECONCILIATION_REQUIRED' ? authCode : code }, 'Authentication operation unavailable');
    return reply.code(status).send(authErrorResponseSchema.parse({ error: { code, message: text } }));
  });
  for (const register of [postSignupRoute, postConfirmRoute, postResendRoute, postLoginRoute, getSessionRoute, postLogoutRoute, postForgotPasswordRoute, postResetPasswordRoute]) {
    app.register(register, context);
  }
}
