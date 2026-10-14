import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { resetPasswordRequestSchema } from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import { message } from '../responses';
import { clearSessionCookie } from '../cookies';

export function postResetPasswordHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, code, password } = parseRequest(resetPasswordRequestSchema, request.body);
    await context.service.resetPassword(email, code, password);
    clearSessionCookie(reply, context.config);
    return message('Password reset. Sign in with your new password.');
  };
}
