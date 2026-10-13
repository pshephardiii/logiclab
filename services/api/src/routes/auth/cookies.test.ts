import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { setSessionCookie, clearSessionCookie, assertAuthOrigin } from './cookies';
import { readAuthConfig } from '../../config/auth';

test('session cookies are HttpOnly, secure, scoped, and cleared with matching attributes', async () => {
  const config = readAuthConfig({ AUTH_ENABLED: 'true', AWS_REGION: 'us-east-1', COGNITO_USER_POOL_ID: 'us-east-1_test', COGNITO_CLIENT_ID: 'client', COGNITO_CLIENT_SECRET: 'secret', AUTH_TOKEN_KEY: 'ab'.repeat(32), APP_ORIGIN: 'https://example.com' })!;
  const app = Fastify(); await app.register(cookie);
  app.post('/api/test', async (request, reply) => {
    assertAuthOrigin(request, config); setSessionCookie(reply, config, 'opaque-id', 100); return { ok: true };
  });
  app.post('/api/logout', async (_request, reply) => { clearSessionCookie(reply, config); return { ok: true }; });
  try {
    const accepted = await app.inject({ method: 'POST', url: '/api/test', headers: { origin: config.APP_ORIGIN } });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.headers['set-cookie']).toEqual(expect.stringContaining('HttpOnly'));
    for (const flag of ['Secure', 'SameSite=Strict', 'Path=/api', 'Max-Age=100']) expect(accepted.headers['set-cookie']).toEqual(expect.stringContaining(flag));
    const rejected = await app.inject({ method: 'POST', url: '/api/test', headers: { origin: 'https://other.example.com' } });
    expect(rejected.headers['set-cookie']).toBeUndefined();
    const cleared = await app.inject({ method: 'POST', url: '/api/logout' });
    expect(cleared.headers['set-cookie']).toEqual(expect.stringContaining('Path=/api'));
    expect(cleared.headers['set-cookie']).toEqual(expect.stringContaining('Expires=Thu, 01 Jan 1970'));
  } finally { await app.close(); }
});
