import type { FastifyRequest } from 'fastify';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { getEnrollmentsHandler } from './handler';
const request = (extra: object = {}) =>
  ({
    cookies: { logiclab_session: sessionId },
    body: { code: 'a'.repeat(32) },
    query: {},
    params: { classId: classroom.id },
    ...extra,
  }) as unknown as FastifyRequest;
function fixture() {
  const fixture = classroomFixture();
  fixture.service.authenticate.mockResolvedValue({ ...fixture.user, role: 'student' });
  return fixture;
}
test('scopes listEnrolled to the authenticated student', async () => {
  const { context, classrooms, user } = fixture();
  const result = await getEnrollmentsHandler(context)(request());
  expect(result).toEqual({ classrooms: [classroom], nextOffset: null });
  expect(classrooms.listEnrolled).toHaveBeenCalledWith(user.id, 21, 0);
});
test('rejects anonymous and instructor access without storage operations', async () => {
  const { context, service, classrooms, user } = fixture();
  const handler = getEnrollmentsHandler(context);
  await expect(handler(request({ cookies: {} }))).rejects.toThrow('SESSION_INVALID');
  service.authenticate.mockResolvedValue({ ...user, role: 'instructor' });
  await expect(handler(request())).rejects.toMatchObject({ status: 403 });
  expect(classrooms.listEnrolled).not.toHaveBeenCalled();
});
test('paginates enrolled classes and rejects user filters', async () => {
  const { context, classrooms, user } = fixture();
  classrooms.listEnrolled.mockResolvedValue([classroom, classroom]);
  expect(
    await getEnrollmentsHandler(context)(request({ query: { limit: '1', offset: '2' } })),
  ).toEqual({ classrooms: [classroom], nextOffset: 3 });
  expect(classrooms.listEnrolled).toHaveBeenCalledWith(user.id, 2, 2);
  await expect(
    getEnrollmentsHandler(context)(request({ query: { studentId: user.id } })),
  ).rejects.toThrow('INVALID_REQUEST');
});

test.each([0, 1, 2])('final page with %i rows has no next offset', async (count) => {
  const { context, classrooms, user } = fixture();
  const rows = Array.from({ length: count }, () => classroom);
  classrooms.listEnrolled.mockResolvedValue(rows);
  expect(
    await getEnrollmentsHandler(context)(request({ query: { limit: '2', offset: '4' } })),
  ).toEqual({ classrooms: rows, nextOffset: null });
  expect(classrooms.listEnrolled).toHaveBeenCalledWith(user.id, 3, 4);
});
