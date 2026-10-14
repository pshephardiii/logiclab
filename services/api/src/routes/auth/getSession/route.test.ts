import { buildApp } from '../../../app';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('registers GET /api/auth/session', async () => {
  const { context, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});

test('session lookup clears expired cookies and returns 401', async () => {
  const { context, service } = authFixture();
  service.authenticate.mockRejectedValue(
    Object.assign(new Error('SESSION_EXPIRED'), { name: 'NotAuthorizedException' }),
  );
  const app = buildApp({ auth: context });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(401);
    expect(response.headers['set-cookie']).toEqual(
      expect.stringContaining('Expires=Thu, 01 Jan 1970'),
    );
  } finally {
    await app.close();
  }
});
