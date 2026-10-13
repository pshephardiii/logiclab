import { buildApp } from '../../app';
import { authFixture, password, sessionId } from '../../../test/auth-fixture';

test('auth group supplies read/mutation defaults and keeps mutation buckets separate', async () => {
  const { context, headers } = authFixture(); const app = buildApp({ auth: context });
  try {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', headers, payload: { email: 'person@example.com', password } });
    expect(login.headers['x-ratelimit-limit']).toBe('10');
    expect(Number(login.headers['x-ratelimit-reset'])).toBeGreaterThan(60);
    const session = () => app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: `logiclab_session=${sessionId}` } });
    const first = await session(); expect(first.headers['x-ratelimit-limit']).toBe('60');
    expect(Number(first.headers['x-ratelimit-reset'])).toBeLessThanOrEqual(60);
    for (let index = 1; index < 60; index++) expect((await session()).statusCode).toBe(200);
    expect((await session()).statusCode).toBe(429);
    for (let index = 1; index < 10; index++) expect((await app.inject({ method: 'POST', url: '/api/auth/login', headers, payload: { email: 'person@example.com', password } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', headers, payload: { email: 'person@example.com', password } })).statusCode).toBe(429);
    const forgot = await app.inject({ method: 'POST', url: '/api/auth/forgot-password', headers, payload: { email: 'person@example.com' } });
    expect(forgot.statusCode).toBe(202);expect(forgot.headers['x-ratelimit-limit']).toBe('10');
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);expect(health.headers['x-ratelimit-limit']).toBeUndefined();
  } finally { await app.close(); }
});

test('explicit route overrides are respected', async () => {
  const { context, headers, service } = authFixture(); const app = buildApp({ auth: context });
  app.addHook('onRoute', route => {
    if (route.url === '/api/auth/login') route.config = { ...route.config, rateLimit: { max: 2, timeWindow: '1 minute' } };
  });
  try {
    const send = () => app.inject({ method: 'POST', url: '/api/auth/login', headers, payload: { email: 'person@example.com', password } });
    for (let index = 0; index < 2; index++) {
      const response = await send();expect(response.statusCode).toBe(200);expect(response.headers['x-ratelimit-limit']).toBe('2');expect(Number(response.headers['x-ratelimit-reset'])).toBeLessThanOrEqual(60);
    }
    expect((await send()).statusCode).toBe(429);expect(service.login).toHaveBeenCalledTimes(2);
  } finally { await app.close(); }
});

test('a partial override inherits mutation timeWindow and an explicit false disables limiting', async () => {
  const { context, headers } = authFixture(); const app = buildApp({ auth: context });
  app.addHook('onRoute', route => {
    if (route.url === '/api/auth/login') route.config = { ...route.config, rateLimit: { max: 2 } };
    if (route.url === '/api/auth/forgot-password') route.config = { ...route.config, rateLimit: false };
  });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', headers, payload: { email: 'person@example.com', password } });
    expect(response.headers['x-ratelimit-limit']).toBe('2');expect(Number(response.headers['x-ratelimit-reset'])).toBeGreaterThan(60);
    for (let index = 0; index < 11; index++) {
      const unlimited = await app.inject({ method: 'POST', url: '/api/auth/forgot-password', headers, payload: { email: 'person@example.com' } });
      expect(unlimited.statusCode).toBe(202);expect(unlimited.headers['x-ratelimit-limit']).toBeUndefined();
    }
  } finally { await app.close(); }
});
