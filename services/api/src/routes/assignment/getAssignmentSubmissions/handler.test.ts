import type { FastifyRequest } from 'fastify';
import { getAssignmentSubmissionsHandler } from './handler';
import {
  submissionReviewFixture,
  assignment,
  review,
  submissionSummary,
} from '../../../../test/submission-review-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates owner scope for getAssignmentSubmissions', async () => {
  const { context, assignments, user } = submissionReviewFixture();
  const response = await getAssignmentSubmissionsHandler(context)({
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id },
    query: {},
  } as unknown as FastifyRequest);
  expect(assignments.listSubmissions).toHaveBeenCalledWith(user.id, assignment.id, {
    limit: 21,
    offset: 0,
  });
  expect(response).toEqual({ submissions: [submissionSummary], nextOffset: null });
});
