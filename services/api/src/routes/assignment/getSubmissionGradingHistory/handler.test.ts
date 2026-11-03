import type { FastifyRequest } from 'fastify';
import { getSubmissionGradingHistoryHandler } from './handler';
import {
  gradingFixture,
  submissionId,
  gradingHistoryEntry,
} from '../../../../test/grading-fixture';
import { assignment } from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('getSubmissionGradingHistory delegates the authenticated owner and validated grading fields', async () => {
  const { context, user, submissionGrading } = gradingFixture();
  const result = await getSubmissionGradingHistoryHandler(context)({
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id, submissionId },
    query: { limit: '2', offset: '4' },
  } as unknown as FastifyRequest);
  expect(result).toEqual({ revisions: [gradingHistoryEntry], nextOffset: null });
  expect(submissionGrading.history).toHaveBeenCalledWith(user.id, assignment.id, submissionId, {
    limit: 2,
    offset: 4,
  });
});
