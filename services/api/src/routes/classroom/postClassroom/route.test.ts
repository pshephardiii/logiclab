import { buildApp } from '../../../app';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { AuthError } from '../../../application/auth/service';

const url = `/api/classes`;
test('registers POST with scoped response and no-store caching', async () => {
  const { context, headers } = classroomFixture();
  const app = buildApp({ auth: context, classroom: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { name: 'Logic' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).not.toContain('private-subject');
    expect(response.body).not.toContain('ownerId');
  } finally {
    await app.close();
  }
});
test('rejects anonymous, expired, and student sessions', async () => {
  const { context, service, headers, user } = classroomFixture();
  const app = buildApp({ auth: context, classroom: context });
  try {
    const send = (cookie?: string) =>
      app.inject({
        method: 'POST',
        url,
        headers: { ...headers, ...(cookie ? { cookie } : {}) },
        payload: { name: 'Logic' },
      });
    expect((await send()).statusCode).toBe(401);
    service.authenticate.mockRejectedValueOnce(new AuthError('SESSION_EXPIRED'));
    const expired = await send(`logiclab_session=${sessionId}`);
    expect(expired.statusCode).toBe(401);
    expect(expired.headers['set-cookie']).toBeDefined();
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect((await send(`logiclab_session=${sessionId}`)).statusCode).toBe(403);
  } finally {
    await app.close();
  }
});
test('sanitizes storage outages', async () => {
  const { context, classrooms, headers } = classroomFixture();
  classrooms.create.mockRejectedValue(new Error('private database details'));
  const app = buildApp({ auth: context, classroom: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { name: 'Logic' },
    });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('private database');
  } finally {
    await app.close();
  }
});
test('rejects missing/wrong mutation origins and owner spoofing', async () => {
  const { context } = classroomFixture();
  const app = buildApp({ auth: context, classroom: context });
  try {
    for (const origin of [undefined, 'https://other.example']) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url,
            headers: { cookie: `logiclab_session=${sessionId}`, ...(origin ? { origin } : {}) },
            payload: { name: 'Logic' },
          })
        ).statusCode,
      ).toBe(403);
    }
    expect(
      (
        await app.inject({
          method: 'POST',
          url,
          headers: { origin: context.config.APP_ORIGIN, cookie: `logiclab_session=${sessionId}` },
          payload: { name: 'Logic', ownerId: classroom.id },
        })
      ).statusCode,
    ).toBe(400);
  } finally {
    await app.close();
  }
});
