import { buildApp } from '../../../app';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
const url = `/api/enrollments/${classroom.id}`;
test('registers GET with no-store, session/role checks, and safe storage errors', async () => {
  const { context, service, classrooms, user, headers } = classroomFixture();
  const app = buildApp({ auth: context, classroom: context });
  try {
    const send = (extra: object = {}) =>
      app.inject({
        method: 'GET',
        url,
        headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
        ...extra,
      });
    expect((await send({ headers })).statusCode).toBe(401);
    expect((await send()).statusCode).toBe(403);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    const ok = await send();
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['cache-control']).toBe('no-store');
    expect(ok.body).not.toContain('private-subject');
    classrooms.findEnrolled.mockRejectedValue(new Error('private storage error'));
    const failed = await send();
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain('private storage');
  } finally {
    await app.close();
  }
});
