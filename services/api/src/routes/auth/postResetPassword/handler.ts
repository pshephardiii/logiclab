import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { resetPasswordRequestSchema } from '@logiclab/schema';
import { parseBody, message } from '../helpers';
import { clearSessionCookie } from '../../../auth/cookies';

export function postResetPasswordHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, code, password } = parseBody(resetPasswordRequestSchema, request.body);
    await context.service.resetPassword(email, code, password);
    clearSessionCookie(reply, context.config);
    return message('Password reset. Sign in with your new password.');
  };
}
