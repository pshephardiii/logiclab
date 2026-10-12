import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { loginRequestSchema } from '@logiclab/schema';
import { parseBody, publicUser } from '../helpers';
import { SESSION_COOKIE, setSessionCookie } from '../../../auth/cookies';

export function postLoginHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = parseBody(loginRequestSchema, request.body);
    const result = await context.service.login(email, password);
    const previous = request.cookies[SESSION_COOKIE];
    if (previous && previous !== result.sessionId) {
      try { await context.service.logout(previous); } catch { request.log.warn('Previous session cleanup could not complete'); }
    }
    setSessionCookie(reply, context.config, result.sessionId, result.maxAge);
    return publicUser(result.user);
  };
}
