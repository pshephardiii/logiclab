import { buildApp } from '../../../app';
import { problemFixture, problem, draftInput } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('PATCH /api/problems/${problem.id} is registered within the private instructor group', async () => {
  const { context, headers, service } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/problems/${problem.id}`,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { title: 'Changed' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});
