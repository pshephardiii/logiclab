import { buildApp } from '../../../app';
import {
  submissionReviewFixture,
  assignment,
  review,
  submissionSummary,
} from '../../../../test/submission-review-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('getAssignmentSubmissions requires an instructor and disables caching', async () => {
  const { context, headers, service, user } = submissionReviewFixture();
  const app = buildApp({ assignment: context });
  const request = { method: 'GET' as const, url: `/api/assignments/${assignment.id}/submissions` };
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

test('submission pagination distinguishes following, exactly full final, and empty pages', async () => {
  const { context, headers, assignments } = submissionReviewFixture();
  const app = buildApp({ assignment: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const row = submissionSummary;
    assignments.listSubmissions.mockResolvedValue([row, row]);
    const query = {
      method: 'GET' as const,
      url: `/api/assignments/${assignment.id}/submissions?limit=1&offset=4`,
      headers: authenticated,
    };
    expect((await app.inject(query)).json().nextOffset).toBe(5);
    assignments.listSubmissions.mockResolvedValue([row]);
    expect((await app.inject(query)).json().nextOffset).toBeNull();
    assignments.listSubmissions.mockResolvedValue([]);
    expect((await app.inject(query)).json()).toEqual({ submissions: [], nextOffset: null });
  } finally {
    await app.close();
  }
});
