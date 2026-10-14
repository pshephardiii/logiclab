import { buildApp } from '../../../app';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('registers POST /api/auth/logout', async () => {
  const { context, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});

test('rejects cross-origin requests before provider calls', async () => {
  const { context, service } = authFixture();
  const app = buildApp({ auth: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: 'https://attacker.example' },
      payload: {},
    });
    expect(response.statusCode).toBe(403);
    expect(service.logout).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
