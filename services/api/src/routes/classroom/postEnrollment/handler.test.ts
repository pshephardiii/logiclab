import type { FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { postEnrollmentHandler } from './handler';
const request = (extra: object = {}) => ({ cookies: { logiclab_session: sessionId }, body: { code: 'a'.repeat(32) }, query: {}, params: { classId: classroom.id }, ...extra }) as unknown as FastifyRequest;
function fixture() { const fixture = classroomFixture(); fixture.service.authenticate.mockResolvedValue({ ...fixture.user, role: 'student' }); return fixture; }
test('scopes join to the authenticated student', async () => {
  const { context, classrooms, user } = fixture();
  const result = await postEnrollmentHandler(context)(request());
  expect(result).toEqual({ classroom });
  expect(classrooms.join).toHaveBeenCalledWith(user.id, createHash('sha256').update('a'.repeat(32)).digest('hex'));
});
test('rejects anonymous and instructor access without storage operations', async () => {
  const { context, service, classrooms, user } = fixture();const handler = postEnrollmentHandler(context);
  await expect(handler(request({ cookies: {} }))).rejects.toThrow('SESSION_INVALID');
  service.authenticate.mockResolvedValue({ ...user, role: 'instructor' });
  await expect(handler(request())).rejects.toMatchObject({ status: 403 });
  expect(classrooms.join).not.toHaveBeenCalled();
});
test.each([{ code: 'bad' }, { code: 'a'.repeat(32), studentId: classroom.id }, { code: 'a'.repeat(32), classId: classroom.id }])('rejects malformed codes and identity spoofing: %j', async body => {
  const { context, classrooms } = fixture();
  await expect(postEnrollmentHandler(context)(request({ body }))).rejects.toThrow('INVALID_REQUEST');expect(classrooms.join).not.toHaveBeenCalled();
});
test('returns the same safe failure for unavailable invitations', async () => {
  const { context, classrooms } = fixture();classrooms.join.mockResolvedValue(null);
  await expect(postEnrollmentHandler(context)(request())).rejects.toMatchObject({ status: 400, code: 'INVITATION_INVALID' });
});
