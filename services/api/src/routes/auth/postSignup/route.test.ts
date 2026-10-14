import { buildApp } from '../../../app';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('registers POST /api/auth/signup', async () => {
  const { context, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { email: 'Person@Example.com', password, role: 'student' },
    });
    expect(response.statusCode).toBe(202);
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
      url: '/api/auth/signup',
      headers: { origin: 'https://attacker.example' },
      payload: { email: 'Person@Example.com', password, role: 'student' },
    });
    expect(response.statusCode).toBe(403);
    expect(service.signup).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
