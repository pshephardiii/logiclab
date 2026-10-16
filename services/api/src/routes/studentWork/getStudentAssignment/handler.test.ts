import type { FastifyRequest } from 'fastify';
import { getStudentAssignmentHandler } from './handler';
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

test('getStudentAssignment delegates validated identifiers and the authenticated student', async () => {
  const { context, studentWork, user } = studentWorkFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId },
    query: {},
    body: undefined,
  } as unknown as FastifyRequest;
  const response = await getStudentAssignmentHandler(context)(request);
  expect(studentWork.read).toHaveBeenCalledWith(user.id, assignmentId);
  expect(response).toEqual(detail);
});
