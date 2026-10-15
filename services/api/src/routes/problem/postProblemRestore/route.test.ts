import { buildApp } from '../../../app';
import { problemFixture, problem } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('POST /api/problems/${problem.id}/restore is private, uncached, and authenticates once', async () => {
  const { context, headers, service } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/problems/${problem.id}/restore`,
      payload: {},
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});
