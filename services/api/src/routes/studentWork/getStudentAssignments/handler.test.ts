import type { FastifyRequest } from 'fastify';
import { getStudentAssignmentsHandler } from './handler';
import {
  studentWorkFixture,
  classId,
  assignmentId,
  itemId,
  detail,
  summary,
  attempt,
  submitted,
} from '../../../../test/student-work-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('getStudentAssignments delegates validated identifiers and the authenticated student', async () => {
  const { context, studentWork, user } = studentWorkFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { classId },
    query: {},
    body: undefined,
  } as unknown as FastifyRequest;
  const response = await getStudentAssignmentsHandler(context)(request);
  expect(studentWork.list).toHaveBeenCalledWith(user.id, classId, { limit: 21, offset: 0 });
  expect(response).toEqual({ assignments: [summary], nextOffset: null });
});

test.each([0, 1, 2, 3])(
  'student assignment page with %i rows preserves order and has no phantom final page',
  async (count) => {
    const { context, studentWork, user } = studentWorkFixture();
    const rows = Array.from({ length: count }, (_, index) => ({
      ...summary,
      title: `Work ${index}`,
    }));
    studentWork.list.mockResolvedValue(rows);
    const result = await getStudentAssignmentsHandler(context)({
      cookies: { logiclab_session: sessionId },
      params: { classId },
      query: { limit: '2', offset: '4' },
    } as unknown as FastifyRequest);
    expect(result).toEqual({ assignments: rows.slice(0, 2), nextOffset: count > 2 ? 6 : null });
    expect(studentWork.list).toHaveBeenCalledWith(user.id, classId, { limit: 3, offset: 4 });
  },
);
