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

test('instructor authoring accepts biconditional/tilde and rejects ambiguous chains before storage', async () => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  const request = (formula: string) =>
    app.inject({
      method: 'POST',
      url: '/api/problems',
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { ...draftInput, definition: { ...draftInput.definition, formula } },
    });
  try {
    expect((await request('~[P <-> Q]')).statusCode).toBe(201);
    expect(problems.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ definition: expect.objectContaining({ formula: '~[P <-> Q]' }) }),
    );
    problems.create.mockClear();
    const invalid = await request('P ↔ Q ↔ R');
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error).toMatchObject({ code: 'UNEXPECTED_TOKEN', position: 6 });
    expect(problems.create).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
