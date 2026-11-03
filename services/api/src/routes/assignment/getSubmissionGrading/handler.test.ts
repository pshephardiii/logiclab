import type { FastifyRequest } from 'fastify';
import { getSubmissionGradingHandler } from './handler';
import { gradingFixture, submissionId, initialGrading } from '../../../../test/grading-fixture';
import { assignment } from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('getSubmissionGrading delegates the authenticated owner and validated grading fields', async () => {
  const { context, user, submissionGrading } = gradingFixture();
  const result = await getSubmissionGradingHandler(context)({
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id, submissionId },
  } as unknown as FastifyRequest);
  expect(result).toEqual(initialGrading);
  expect(submissionGrading.read).toHaveBeenCalledWith(user.id, assignment.id, submissionId);
});
