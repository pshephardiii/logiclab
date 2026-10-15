import { buildApp } from '../../app';
import { problemFixture, problem, publishedVersion } from '../../../test/problem-fixture';
import { sessionId } from '../../../test/auth-fixture';

const operations = [
  { method: 'POST' as const, url: `/api/problems/${problem.id}/versions`, payload: {} },
  { method: 'GET' as const, url: `/api/problems/${problem.id}/versions` },
  { method: 'GET' as const, url: `/api/problems/${problem.id}/versions/1` },
  { method: 'POST' as const, url: `/api/problems/${problem.id}/archive`, payload: {} },
  { method: 'POST' as const, url: `/api/problems/${problem.id}/restore`, payload: {} },
];
test.each(operations)('blocks anonymous/student access for $method $url', async (operation) => {
  const { context, headers, problems, service, user } = problemFixture();
  const app = buildApp({ problem: context });
  try {
    expect((await app.inject({ ...operation, headers })).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect(
      (
        await app.inject({
          ...operation,
          headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
        })
      ).statusCode,
    ).toBe(403);
    for (const method of Object.values(problems)) expect(method).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
test('publication rejects client snapshot content, requires origin, and handles missing/archived parents', async () => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  const request = {
    method: 'POST' as const,
    url: `/api/problems/${problem.id}/versions`,
    headers: authenticated,
  };
  try {
    expect(
      (await app.inject({ ...request, payload: { title: 'Spoofed snapshot' } })).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ ...request, headers: { cookie: authenticated.cookie }, payload: {} }))
        .statusCode,
    ).toBe(403);
    expect(problems.publish).not.toHaveBeenCalled();
    problems.publish.mockResolvedValue({ status: 'not_found' });
    expect((await app.inject({ ...request, payload: {} })).statusCode).toBe(404);
    problems.publish.mockResolvedValue({ status: 'archived' });
    expect((await app.inject({ ...request, payload: {} })).statusCode).toBe(409);
  } finally {
    await app.close();
  }
});
test.each(['archive', 'restore'])(
  'hidden parents and unexpected fields are rejected for %s',
  async (action) => {
    const { context, headers, problems } = problemFixture();
    const app = buildApp({ problem: context });
    const request = {
      method: 'POST' as const,
      url: `/api/problems/${problem.id}/${action}`,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    };
    try {
      expect((await app.inject({ ...request, payload: { ownerId: 'spoofed' } })).statusCode).toBe(
        400,
      );
      problems.setArchived.mockResolvedValue(null);
      expect((await app.inject({ ...request, payload: {} })).statusCode).toBe(404);
    } finally {
      await app.close();
    }
  },
);
test('history is paginated, hides foreign parents, validates version numbers, and bounds filters', async () => {
  const { context, headers, problems } = problemFixture();
  const app = buildApp({ problem: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    problems.listVersions.mockResolvedValue([publishedVersion, publishedVersion]);
    const page = await app.inject({
      method: 'GET',
      url: `/api/problems/${problem.id}/versions?limit=1&offset=2`,
      headers: authenticated,
    });
    expect(page.json()).toEqual({ versions: [publishedVersion], nextOffset: 3 });
    expect(problems.listVersions).toHaveBeenCalledWith(expect.any(String), problem.id, 2, 2);
    problems.listVersions.mockResolvedValue([]);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/problems/${problem.id}/versions`,
          headers: authenticated,
        })
      ).json(),
    ).toEqual({ versions: [], nextOffset: null });
    problems.listVersions.mockResolvedValue(null);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/problems/${problem.id}/versions`,
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(404);
    problems.findVersion.mockResolvedValue(null);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/problems/${problem.id}/versions/1`,
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(404);
    for (const version of ['0', '-1', '1.5', 'abc', '2147483648'])
      expect(
        (
          await app.inject({
            method: 'GET',
            url: `/api/problems/${problem.id}/versions/${version}`,
            headers: authenticated,
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/problems?archive=invalid',
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/problems?archive=archived',
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(200);
    expect(problems.list).toHaveBeenLastCalledWith(expect.any(String), 21, 0, 'archived');
  } finally {
    await app.close();
  }
});
