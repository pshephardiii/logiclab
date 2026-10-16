import { buildApp } from '../../../app';
import {
  submissionReviewFixture,
  assignment,
  review,
} from '../../../../test/submission-review-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('getAssignmentSubmission requires an instructor and disables caching', async () => {
  const { context, headers, service, user } = submissionReviewFixture();
  const app = buildApp({ assignment: context });
  const request = {
    method: 'GET' as const,
    url: `/api/assignments/${assignment.id}/submissions/${review.attempt.id}`,
  };
  try {
    expect((await app.inject({ ...request, headers })).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect(
      (
        await app.inject({
          ...request,
          headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
        })
      ).statusCode,
    ).toBe(403);
    service.authenticate.mockResolvedValue(user);
    service.authenticate.mockClear();
    const response = await app.inject({
      ...request,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});
