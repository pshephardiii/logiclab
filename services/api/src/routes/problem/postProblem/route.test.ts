import {
  dependencyDefinitionFixture,
  derivationDefinitionFixture,
} from '../../../../test/derivation-fixture';
import { libraryReferenceCheck } from '../../../application/problem/library-definition';
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

test('dependency owner HTTP round-trips drafts and versions without accepting mismatched references', async () => {
  const { context, headers, problems } = problemFixture();
  const definition = dependencyDefinitionFixture();
  const saved = { ...problem, definition };
  const version = {
    id: problem.id,
    problemId: problem.id,
    version: 1,
    title: problem.title,
    instructions: null,
    definition,
    publishedAt: problem.createdAt,
  };
  problems.create.mockResolvedValue(saved);
  problems.update.mockResolvedValue({ status: 'updated', problem: saved });
  problems.list.mockResolvedValue([saved]);
  problems.publish.mockResolvedValue({ status: 'published', version });
  problems.listVersions.mockResolvedValue([version]);
  problems.findVersion.mockResolvedValue(version);
  problems.previewReference.mockResolvedValue({
    problemId: problem.id,
    updatedAt: problem.updatedAt,
    check: libraryReferenceCheck(definition),
  });
  const app = buildApp({ problem: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    for (const [method, url, payload, status] of [
      ['POST', '/api/problems', { title: 'Dependency', definition }, 201],
      ['PATCH', `/api/problems/${problem.id}`, { definition }, 200],
      ['GET', '/api/problems', undefined, 200],
      ['POST', `/api/problems/${problem.id}/versions`, {}, 201],
      ['GET', `/api/problems/${problem.id}/versions`, undefined, 200],
      ['GET', `/api/problems/${problem.id}/versions/1`, undefined, 200],
    ] as const) {
      const response = await app.inject({ method, url, payload, headers: authenticated });
      expect(response.statusCode).toBe(status);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toContain('dependency');
    }
    const checked = await app.inject({
      method: 'POST',
      url: `/api/problems/${problem.id}/reference-check`,
      payload: {},
      headers: authenticated,
    });
    expect(checked.statusCode).toBe(200);
    expect(checked.json().check.report.status).toBe('accepted');
    problems.create.mockClear();
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/problems',
      headers: authenticated,
      payload: {
        title: 'Mismatch',
        definition: { ...definition, referenceProof: derivationDefinitionFixture().referenceProof },
      },
    });
    expect(invalid.statusCode).toBe(400);
    expect(problems.create).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
