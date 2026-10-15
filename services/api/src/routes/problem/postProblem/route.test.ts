import { buildApp } from '../../../app';
import { problemFixture, problem, draftInput } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('POST /api/problems is registered within the private instructor group', async () => {
  const { context, headers, service } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/problems`,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: draftInput,
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});
