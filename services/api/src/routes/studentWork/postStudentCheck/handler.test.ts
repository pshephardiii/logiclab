import type { FastifyRequest } from 'fastify';
import { postStudentCheckHandler } from './handler';
import { studentWorkFixture, assignmentId, itemId } from '../../../../test/student-work-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates transient answers with the authenticated student without calling save or submit', async () => {
  const { context, studentWork, user } = studentWorkFixture();
  const body = { itemId, answers: [] };
  const response = await postStudentCheckHandler(context)({
    cookies: { logiclab_session: sessionId },
    params: { assignmentId },
    body,
  } as unknown as FastifyRequest);
  expect(studentWork.check).toHaveBeenCalledWith(user.id, assignmentId, body);
  expect(response.itemId).toBe(itemId);
  expect(studentWork.save).not.toHaveBeenCalled();
  expect(studentWork.submit).not.toHaveBeenCalled();
});
