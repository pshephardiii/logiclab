import type { FastifyRequest } from 'fastify';
import { patchSubmissionGradingHandler } from './handler';
import {
  gradingFixture,
  submissionId,
  gradingInput,
  updatedGrading,
} from '../../../../test/grading-fixture';
import { assignment } from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('patchSubmissionGrading delegates the authenticated owner and validated grading fields', async () => {
  const { context, user, submissionGrading } = gradingFixture();
  const result = await patchSubmissionGradingHandler(context)({
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id, submissionId },
    body: gradingInput,
  } as unknown as FastifyRequest);
  expect(result).toEqual(updatedGrading);
  expect(submissionGrading.update).toHaveBeenCalledWith(
    user.id,
    assignment.id,
    submissionId,
    gradingInput,
  );
});
