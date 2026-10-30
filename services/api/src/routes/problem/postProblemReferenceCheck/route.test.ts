import { buildApp } from '../../../app';
import { problemFixture, problem } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { derivationDefinitionFixture } from '../../../../test/derivation-fixture';
import { checkDerivationReference } from '../../../application/problem/derivation-authoring';

const url = `/api/problems/${problem.id}/reference-check`;
const result = {
  problemId: problem.id,
  updatedAt: problem.updatedAt,
  check: checkDerivationReference(derivationDefinitionFixture()),
};

test('checks the saved owner reference, returns bounded diagnostics and never mutates library data', async () => {
  const { context, headers, problems, user } = problemFixture();
  problems.previewReference.mockResolvedValue(result);
  const app = buildApp({ problem: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url,
      payload: {},
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual(result);
    expect(problems.previewReference).toHaveBeenCalledWith(user.id, problem.id);
    for (const name of ['create', 'update', 'publish'] as const)
      expect(problems[name]).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});

test('authorization precedes validation; origin, path and replacement-proof fields are rejected', async () => {
  const { context, headers, problems, service, user } = problemFixture();
  const app = buildApp({ problem: context });
  const request = { method: 'POST' as const, url, payload: {} };
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    expect(
      (await app.inject({ ...request, url: '/api/problems/invalid/reference-check', headers }))
        .statusCode,
    ).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect((await app.inject({ ...request, headers: authenticated })).statusCode).toBe(403);
    service.authenticate.mockResolvedValue(user);
    expect(
      (await app.inject({ ...request, headers: { cookie: authenticated.cookie } })).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          ...request,
          headers: authenticated,
          url: '/api/problems/invalid/reference-check',
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          ...request,
          headers: authenticated,
          payload: { referenceProof: derivationDefinitionFixture().referenceProof },
        })
      ).statusCode,
    ).toBe(400);
    expect(problems.previewReference).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});

test('unknown owners remain hidden and unexpected private errors are sanitized', async () => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  const request = {
    method: 'POST' as const,
    url,
    payload: {},
    headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
  };
  try {
    expect((await app.inject(request)).statusCode).toBe(404);
    problems.previewReference.mockRejectedValue(new Error('SECRET_REFERENCE'));
    const response = await app.inject(request);
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('SECRET_REFERENCE');
  } finally {
    await app.close();
  }
});

test('saved-reference checks inherit the bounded mutation rate policy', async () => {
  const { context, headers, problems } = problemFixture();
  problems.previewReference.mockResolvedValue(result);
  const app = buildApp({ problem: context });
  try {
    for (let index = 0; index < 11; index++) {
      const response = await app.inject({
        method: 'POST',
        url,
        payload: {},
        headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      });
      expect(response.statusCode).toBe(index < 10 ? 200 : 429);
    }
    expect(problems.previewReference).toHaveBeenCalledTimes(10);
  } finally {
    await app.close();
  }
});
