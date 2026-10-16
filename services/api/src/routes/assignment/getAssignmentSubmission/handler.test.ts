import type { FastifyRequest } from 'fastify';
import { getAssignmentSubmissionHandler } from './handler';
import {
  submissionReviewFixture,
  assignment,
  review,
  submissionSummary,
} from '../../../../test/submission-review-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates owner scope for getAssignmentSubmission', async () => {
  const { context, assignments, user } = submissionReviewFixture();
  const response = await getAssignmentSubmissionHandler(context)({
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id, submissionId: review.attempt.id },
    query: {},
  } as unknown as FastifyRequest);
  expect(assignments.findSubmission).toHaveBeenCalledWith(
    user.id,
    assignment.id,
    review.attempt.id,
  );
  expect(response).toEqual(review);
});
