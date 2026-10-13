import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { emptyAuthRequestSchema } from '@logiclab/contracts';
import { parseBody, message } from '../helpers';
import { SESSION_COOKIE, clearSessionCookie } from '../cookies';

export function postLogoutHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    parseBody(emptyAuthRequestSchema, request.body ?? {});
    const id = request.cookies[SESSION_COOKIE];
    try { if (id) await context.service.logout(id); }
    finally { clearSessionCookie(reply, context.config); }
    return message('Signed out.');
  };
}
