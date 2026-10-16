import type { FastifyRequest } from 'fastify';
import { postStudentSubmissionHandler } from './handler';
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

test('postStudentSubmission delegates validated identifiers and the authenticated student', async () => {
  const { context, studentWork, user } = studentWorkFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId },
    query: {},
    body: { revision: 1 },
  } as unknown as FastifyRequest;
  const response = await postStudentSubmissionHandler(context)(request);
  expect(studentWork.submit).toHaveBeenCalledWith(user.id, assignmentId, 1);
  expect(response).toEqual({ attempt: submitted });
});
