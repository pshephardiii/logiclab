import type { FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { getEnrollmentHandler } from './handler';
const request = (extra: object = {}) => ({ cookies: { logiclab_session: sessionId }, body: { code: 'a'.repeat(32) }, query: {}, params: { classId: classroom.id }, ...extra }) as unknown as FastifyRequest;
function fixture() { const fixture = classroomFixture(); fixture.service.authenticate.mockResolvedValue({ ...fixture.user, role: 'student' }); return fixture; }
test('scopes findEnrolled to the authenticated student', async () => {
  const { context, classrooms, user } = fixture();
  const result = await getEnrollmentHandler(context)(request());
  expect(result).toEqual({ classroom });
  expect(classrooms.findEnrolled).toHaveBeenCalledWith(user.id, classroom.id);
});
test('rejects anonymous and instructor access without storage operations', async () => {
  const { context, service, classrooms, user } = fixture();const handler = getEnrollmentHandler(context);
  await expect(handler(request({ cookies: {} }))).rejects.toThrow('SESSION_INVALID');
  service.authenticate.mockResolvedValue({ ...user, role: 'instructor' });
  await expect(handler(request())).rejects.toMatchObject({ status: 403 });
  expect(classrooms.findEnrolled).not.toHaveBeenCalled();
});
test('does not expose a class the student has not joined', async () => {
  const { context, classrooms } = fixture();classrooms.findEnrolled.mockResolvedValue(null);
  await expect(getEnrollmentHandler(context)(request())).rejects.toMatchObject({ status: 404 });
});
test('rejects invalid class IDs', async () => {
  const { context, classrooms } = fixture();
  await expect(getEnrollmentHandler(context)(request({ params: { classId: 'bad' } }))).rejects.toThrow('INVALID_REQUEST');expect(classrooms.findEnrolled).not.toHaveBeenCalled();
});
