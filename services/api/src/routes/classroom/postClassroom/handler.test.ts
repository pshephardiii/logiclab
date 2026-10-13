import type { FastifyRequest, FastifyReply } from 'fastify';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { postClassroomHandler } from './handler';
const request = (extra: object = {}) => ({ cookies: { logiclab_session: sessionId }, body: { name: '  Introduction to logic  ' }, query: {}, params: { classId: classroom.id }, ...extra }) as unknown as FastifyRequest;
test('creates a trimmed name with the authenticated owner and returns 201', async () => {
  const { context, classrooms, user } = classroomFixture();
  const reply = { code: jest.fn().mockReturnThis(), send: jest.fn(value => value) } as unknown as FastifyReply;
  expect(await postClassroomHandler(context)(request(), reply)).toEqual({ classroom });
  expect(classrooms.create).toHaveBeenCalledWith(user.id, 'Introduction to logic');
  expect(reply.code).toHaveBeenCalledWith(201);
});
test.each([{ name: '' }, { name: ' '.repeat(5) }, { name: 'x'.repeat(121) }, { name: 'Logic', ownerId: 'spoofed' }])('rejects invalid or owner-spoofing fields: %j', async body => {
  const { context, classrooms } = classroomFixture();
  await expect(postClassroomHandler(context)(request({ body }), {} as FastifyReply)).rejects.toThrow('INVALID_REQUEST');
  expect(classrooms.create).not.toHaveBeenCalled();
});
test('requires a session and instructor role before storage access', async () => {
  const { context, service, classrooms, user } = classroomFixture();
  const handler = postClassroomHandler(context);
  await expect(handler(request({ cookies: {} }), {} as FastifyReply)).rejects.toThrow('SESSION_INVALID');
  service.authenticate.mockResolvedValue({ ...user, role: 'student' });
  await expect(handler(request(), {} as FastifyReply)).rejects.toMatchObject({ status: 403 });
  expect(classrooms.create).not.toHaveBeenCalled(); expect(classrooms.list).not.toHaveBeenCalled(); expect(classrooms.findOwned).not.toHaveBeenCalled();
});
