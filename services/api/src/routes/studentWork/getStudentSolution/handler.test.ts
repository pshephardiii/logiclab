import type { FastifyRequest } from 'fastify';
import { getStudentSolutionHandler } from './handler';
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

test('getStudentSolution delegates validated identifiers and the authenticated student', async () => {
  const { context, studentWork, user } = studentWorkFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId, itemId },
    query: {},
    body: undefined,
  } as unknown as FastifyRequest;
  const response = await getStudentSolutionHandler(context)(request);
  expect(studentWork.solution).toHaveBeenCalledWith(user.id, assignmentId, itemId);
  expect(response.itemId).toBe(itemId);
});
