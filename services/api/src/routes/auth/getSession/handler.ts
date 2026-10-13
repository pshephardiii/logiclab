import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { publicUser } from '../helpers';
import { SESSION_COOKIE } from '../../../auth/cookies';
import { AuthError } from '../../../auth/service';

export function getSessionHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const id = request.cookies[SESSION_COOKIE];
    if (!id) throw new AuthError('SESSION_INVALID');
    return publicUser(await context.service.authenticate(id));
  };
}
