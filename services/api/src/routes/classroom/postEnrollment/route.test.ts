import { buildApp } from '../../../app';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
const url = `/api/enrollments`;
test('registers POST with no-store, session/role checks, and safe storage errors', async () => {
  const { context, service, classrooms, user, headers } = classroomFixture();const app = buildApp({ auth: context, classroom: context });
  try {
    const send = (extra: object = {}) => app.inject({ method: 'POST', url, headers: { ...headers, cookie: `logiclab_session=${sessionId}` }, payload: { code: 'a'.repeat(32) }, ...extra });
    expect((await send({ headers })).statusCode).toBe(401);
    expect((await send()).statusCode).toBe(403);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    const ok = await send();expect(ok.statusCode).toBe(200);expect(ok.headers['cache-control']).toBe('no-store');expect(ok.body).not.toContain('private-subject');
    classrooms.join.mockRejectedValue(new Error('private storage error'));
    const failed = await send();expect(failed.statusCode).toBe(503);expect(failed.body).not.toContain('private storage');
  } finally { await app.close(); }
});
test('requires exact origin and throttles redemption attempts', async () => {
  const { context, service, user, headers } = classroomFixture();service.authenticate.mockResolvedValue({ ...user, role: 'student' });const app = buildApp({ auth: context, classroom: context });
  try {
    const send = (extra: object = {}) => app.inject({ method: 'POST', url, headers: { ...headers, cookie: `logiclab_session=${sessionId}` }, payload: { code: 'a'.repeat(32) }, ...extra });
    expect((await send({ headers: { cookie: `logiclab_session=${sessionId}` } })).statusCode).toBe(403);
    for (let index = 0; index < 10; index++) expect((await send()).statusCode).toBe(200);
    expect((await send()).statusCode).toBe(429);
  } finally { await app.close(); }
});
