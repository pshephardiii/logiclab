import { buildApp } from '../../app';
import { problemFixture, problem, draftInput } from '../../../test/problem-fixture';
import { sessionId } from '../../../test/auth-fixture';

const endpoints = [
  { method: 'POST' as const, url: '/api/problems', payload: draftInput },
  { method: 'GET' as const, url: '/api/problems' },
  { method: 'GET' as const, url: `/api/problems/${problem.id}` },
  { method: 'PATCH' as const, url: `/api/problems/${problem.id}`, payload: { title: 'Changed' } },
];
test.each(endpoints)('requires an instructor for $method $url', async (endpoint) => {
  const { context, headers, service, user, problems } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    expect((await app.inject({ ...endpoint, headers })).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect(
      (
        await app.inject({
          ...endpoint,
          headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
        })
      ).statusCode,
    ).toBe(403);
    for (const operation of Object.values(problems)) expect(operation).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
test.each([
  { ...draftInput, ownerId: 'spoofed' },
  { ...draftInput, classroomId: problem.id },
  { ...draftInput, title: ' ' },
  { ...draftInput, definition: { type: 'derivation', definitionVersion: 1 } },
  { ...draftInput, definition: { ...draftInput.definition, definitionVersion: 2 } },
])('rejects unsupported authoring fields before storage', async (payload) => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/problems',
          headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
          payload,
        })
      ).statusCode,
    ).toBe(400);
    expect(problems.create).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
test('normalizes content, rejects invalid formulas, enforces origins and bounds, and sanitizes failures', async () => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const request = { method: 'POST' as const, url: '/api/problems', headers: authenticated };
    expect(
      (
        await app.inject({
          ...request,
          payload: { ...draftInput, title: '  Conjunction  ', instructions: '  Complete it  ' },
        })
      ).statusCode,
    ).toBe(201);
    expect(problems.create.mock.calls[0]![1]).toMatchObject({
      title: 'Conjunction',
      instructions: 'Complete it',
    });
    for (const formula of ['P &', 'P & Q & R & S & T', '!'.repeat(70) + 'P']) {
      const response = await app.inject({
        ...request,
        payload: { ...draftInput, definition: { ...draftInput.definition, formula } },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.position).toEqual(expect.any(Number));
    }
    expect(problems.create).toHaveBeenCalledTimes(1);
    expect(
      (
        await app.inject({
          ...request,
          headers: { cookie: authenticated.cookie },
          payload: draftInput,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/problems?ownerId=spoofed',
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: 'GET', url: '/api/problems?limit=51', headers: authenticated }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/api/problems/${problem.id}`,
          headers: authenticated,
          payload: {},
        })
      ).statusCode,
    ).toBe(400);
    problems.create.mockRejectedValue(new Error('private provider/database details'));
    const failed = await app.inject({ ...request, payload: draftInput });
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain('private');
    expect(failed.json().error.code).toBe('PROBLEM_UNAVAILABLE');
  } finally {
    await app.close();
  }
});
test('authorization precedes invalid path validation and unexpected response fields cannot leak', async () => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    expect((await app.inject({ method: 'GET', url: '/api/problems/invalid' })).statusCode).toBe(
      401,
    );
    const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
    expect(
      (await app.inject({ method: 'GET', url: '/api/problems/invalid', headers: authenticated }))
        .statusCode,
    ).toBe(400);
    problems.findOwned.mockResolvedValue({ ...problem, privateOwner: 'secret' } as typeof problem);
    const response = await app.inject({
      method: 'GET',
      url: `/api/problems/${problem.id}`,
      headers: authenticated,
    });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('secret');
  } finally {
    await app.close();
  }
});
test('group is absent without dependencies and health/practice are still public', async () => {
  const app = buildApp();
  try {
    expect((await app.inject({ method: 'GET', url: '/api/problems' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
  } finally {
    await app.close();
  }
});

test('problem mutations retain the shared rate limit and stop excess storage calls', async () => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/problems',
        headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
        payload: draftInput,
      });
      expect(response.statusCode).toBe(attempt < 10 ? 201 : 429);
      expect(response.headers['x-ratelimit-limit']).toBe('10');
    }
    expect(problems.create).toHaveBeenCalledTimes(10);
  } finally {
    await app.close();
  }
});
