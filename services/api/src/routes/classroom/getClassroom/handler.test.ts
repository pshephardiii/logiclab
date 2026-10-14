import type { FastifyRequest, FastifyReply } from 'fastify';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { getClassroomHandler } from './handler';
const request = (extra: object = {}) =>
  ({
    cookies: { logiclab_session: sessionId },
    body: { name: '  Introduction to logic  ' },
    query: {},
    params: { classId: classroom.id },
    ...extra,
  }) as unknown as FastifyRequest;
test('queries both the class ID and authenticated owner', async () => {
  const { context, classrooms, user } = classroomFixture();
  expect(await getClassroomHandler(context)(request())).toEqual({ classroom });
  expect(classrooms.findOwned).toHaveBeenCalledWith(user.id, classroom.id);
});
test('does not distinguish another owner’s class from a nonexistent class', async () => {
  const { context, classrooms } = classroomFixture();
  classrooms.findOwned.mockResolvedValue(null);
  await expect(getClassroomHandler(context)(request())).rejects.toMatchObject({
    status: 404,
    code: 'CLASS_NOT_FOUND',
  });
});
test('rejects malformed IDs before querying storage', async () => {
  const { context, classrooms } = classroomFixture();
  await expect(
    getClassroomHandler(context)(request({ params: { classId: 'bad' } })),
  ).rejects.toThrow('INVALID_REQUEST');
  expect(classrooms.findOwned).not.toHaveBeenCalled();
});
test('requires a session and instructor role before storage access', async () => {
  const { context, service, classrooms, user } = classroomFixture();
  const handler = getClassroomHandler(context);
  await expect(handler(request({ cookies: {} }))).rejects.toThrow('SESSION_INVALID');
  service.authenticate.mockResolvedValue({ ...user, role: 'student' });
  await expect(handler(request())).rejects.toMatchObject({ status: 403 });
  expect(classrooms.create).not.toHaveBeenCalled();
  expect(classrooms.list).not.toHaveBeenCalled();
  expect(classrooms.findOwned).not.toHaveBeenCalled();
});
