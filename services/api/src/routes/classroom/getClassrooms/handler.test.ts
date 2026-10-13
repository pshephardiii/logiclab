import type { FastifyRequest, FastifyReply } from 'fastify';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { getClassroomsHandler } from './handler';
const request = (extra: object = {}) => ({ cookies: { logiclab_session: sessionId }, body: { name: '  Introduction to logic  ' }, query: {}, params: { classId: classroom.id }, ...extra }) as unknown as FastifyRequest;
test('scopes listing to the session user and bounds each page', async () => {
  const { context, classrooms, user } = classroomFixture();
  classrooms.list.mockResolvedValue([classroom, { ...classroom, id: 'a08a4c77-a9de-4e46-8bb4-3163aa350414' }]);
  expect(await getClassroomsHandler(context)(request({ query: { limit: '1', offset: '2' } }))).toEqual({ classrooms: [classroom], nextOffset: 3 });
  expect(classrooms.list).toHaveBeenCalledWith(user.id, 2, 2);
});
test('returns empty results without a next page', async () => {
  const { context, classrooms } = classroomFixture(); classrooms.list.mockResolvedValue([]);
  expect(await getClassroomsHandler(context)(request())).toEqual({ classrooms: [], nextOffset: null });
});
test.each([{ ownerId: 'spoofed' }, { limit: '51' }, { offset: '-1' }, { limit: 'abc' }])('rejects invalid query %j', async query => {
  const { context, classrooms } = classroomFixture();
  await expect(getClassroomsHandler(context)(request({ query }))).rejects.toThrow('INVALID_REQUEST');
  expect(classrooms.list).not.toHaveBeenCalled();
});
test('requires a session and instructor role before storage access', async () => {
  const { context, service, classrooms, user } = classroomFixture();
  const handler = getClassroomsHandler(context);
  await expect(handler(request({ cookies: {} }))).rejects.toThrow('SESSION_INVALID');
  service.authenticate.mockResolvedValue({ ...user, role: 'student' });
  await expect(handler(request())).rejects.toMatchObject({ status: 403 });
  expect(classrooms.create).not.toHaveBeenCalled(); expect(classrooms.list).not.toHaveBeenCalled(); expect(classrooms.findOwned).not.toHaveBeenCalled();
});
