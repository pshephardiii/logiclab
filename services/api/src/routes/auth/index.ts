import { mapAuthError, confirmationFailureReason } from './errors';
import { installAccountHttpPolicy } from '../account-http';
import type { FastifyInstance } from 'fastify';
import { authErrorResponseSchema } from '@logiclab/contracts';
import { clearSessionCookie } from './cookies';
import type { AuthContext } from './context';
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
    keyGenerator: (request) => request.ip,
  });
  app.setErrorHandler((error, request, reply) => {
    const { status, code, message, logCode } = mapAuthError(error, request.routeOptions.url);
    if (status === 401 && request.routeOptions.url === '/api/auth/session') {
      clearSessionCookie(reply, context.config);
    }
    // Do not log SDK error messages/stacks, request bodies, email addresses, or tokens.
    if (status === 503) {
      request.log.warn({ code: logCode }, 'Authentication operation unavailable');
    }
    if (request.routeOptions.url === '/api/auth/confirm' && code === 'CONFIRMATION_FAILED') {
      request.log.info(
        { code, reason: confirmationFailureReason(error) },
        'Email confirmation rejected',
      );
    }
    return reply.code(status).send(authErrorResponseSchema.parse({ error: { code, message } }));
  });
  for (const register of [
    postSignupRoute,
    postConfirmRoute,
    postResendRoute,
    postLoginRoute,
    getSessionRoute,
    postLogoutRoute,
    postForgotPasswordRoute,
    postResetPasswordRoute,
  ]) {
    app.register(register, context);
  }
}
