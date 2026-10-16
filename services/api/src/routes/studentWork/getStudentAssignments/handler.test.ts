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
