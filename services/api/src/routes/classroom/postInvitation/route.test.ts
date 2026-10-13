import { buildApp } from '../../../app';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { AuthError } from '../../../application/auth/service';
const url = `/api/classes/${classroom.id}/invitation`;
test('issues invitations with no-store and rejects unauthorized mutations', async () => {
  const { context, classrooms, headers, service, user } = classroomFixture(); const app = buildApp({ auth: context, classroom: context });
  try {
    const send = (extra: object = {}) => app.inject({ method: 'POST', url, headers: { ...headers, cookie: `logiclab_session=${sessionId}` }, payload: {}, ...extra });
    expect((await send({ headers })).statusCode).toBe(401);
    expect((await send({ headers: { cookie: `logiclab_session=${sessionId}` } })).statusCode).toBe(403);
    expect((await send({ headers: { ...headers, origin: 'https://other.example' } })).statusCode).toBe(403);
    service.authenticate.mockRejectedValueOnce(new AuthError('SESSION_EXPIRED'));
    expect((await send()).statusCode).toBe(401);
    service.authenticate.mockResolvedValueOnce({ ...user, role: 'student' });
    expect((await send()).statusCode).toBe(403);
    expect((await send({ payload: { expiresAt: '2099-01-01' } })).statusCode).toBe(400);
    const response = await send(); expect(response.statusCode).toBe(200); expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json().invitation.code).toHaveLength(32);
    classrooms.replaceInvitation.mockResolvedValue(false);
    expect((await send()).statusCode).toBe(404);
    classrooms.replaceInvitation.mockRejectedValue(new Error('private database details'));
    const unavailable = await send(); expect(unavailable.statusCode).toBe(503); expect(unavailable.body).not.toContain('private database');
  } finally { await app.close(); }
});
test('rate-limits repeated invitation creation', async () => {
  const { context, headers } = classroomFixture(); const app = buildApp({ auth: context, classroom: context });
  try {
    const send = () => app.inject({ method: 'POST', url, headers: { ...headers, cookie: `logiclab_session=${sessionId}` }, payload: {} });
    for (let index = 0; index < 10; index++) expect((await send()).statusCode).toBe(200);
    expect((await send()).statusCode).toBe(429);
  } finally { await app.close(); }
});
