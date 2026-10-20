import type { FastifyReply, FastifyRequest } from 'fastify';
import type {} from '@fastify/cookie';
export type CookieConfig = {
  APP_ORIGIN: string;
  secureCookies: boolean;
  sessionCookieName?: string;
  sessionCookiePath?: string;
  clearInvalidSessionCookie?: boolean;
};
export const cookieName = (config: CookieConfig) => config.sessionCookieName ?? SESSION_COOKIE;

export const SESSION_COOKIE = 'logiclab_session';
export function setSessionCookie(
  reply: FastifyReply,
  config: CookieConfig,
  id: string,
  maxAge: number,
) {
  reply.setCookie(cookieName(config), id, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'strict',
    path: config.sessionCookiePath ?? '/api',
    maxAge,
  });
}

export function clearSessionCookie(reply: FastifyReply, config: CookieConfig) {
  reply.clearCookie(cookieName(config), {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'strict',
    path: config.sessionCookiePath ?? '/api',
  });
}

/** Call on browser auth mutations, including signup/login, to prevent cross-origin requests. */
export function assertAuthOrigin(request: FastifyRequest, config: CookieConfig) {
  if (request.headers.origin !== config.APP_ORIGIN) throw new Error('AUTH_ORIGIN_REJECTED');
}

/** Demo rotations can race older rejected requests; those responses must not erase a fresh cookie. */
export function clearRejectedSessionCookie(reply: FastifyReply, config: CookieConfig) {
  if (config.clearInvalidSessionCookie !== false) clearSessionCookie(reply, config);
}
