import type { FastifyRequest } from 'fastify';
import { patchStudentAttemptHandler } from './handler';
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

test('patchStudentAttempt delegates validated identifiers and the authenticated student', async () => {
  const { context, studentWork, user } = studentWorkFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId },
    query: {},
    body: { revision: 0, itemId, answers: [] },
  } as unknown as FastifyRequest;
  const response = await patchStudentAttemptHandler(context)(request);
  expect(studentWork.save).toHaveBeenCalledWith(user.id, assignmentId, {
    revision: 0,
    itemId,
    answers: [],
  });
  expect(response).toEqual({ attempt });
});
