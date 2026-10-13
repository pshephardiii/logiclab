import type { FastifyReply, FastifyRequest } from 'fastify';
import type {} from '@fastify/cookie';
import type { AuthConfig } from './config';

export const SESSION_COOKIE = 'logiclab_session';
export function setSessionCookie(reply: FastifyReply, config: AuthConfig, id: string, maxAge: number) {
  reply.setCookie(SESSION_COOKIE, id, { httpOnly: true, secure: config.secureCookies, sameSite: 'strict', path: '/api', maxAge });
}
export function clearSessionCookie(reply: FastifyReply, config: AuthConfig) {
  reply.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.secureCookies, sameSite: 'strict', path: '/api' });
}
/** Call on browser auth mutations, including signup/login, to prevent cross-origin requests. */
export function assertAuthOrigin(request: FastifyRequest, config: AuthConfig) {
  if (request.headers.origin !== config.APP_ORIGIN) throw new Error('AUTH_ORIGIN_REJECTED');
}
