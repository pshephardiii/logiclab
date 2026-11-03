import type { FastifyRequest } from 'fastify';
import { getProblemVersionsHandler } from './handler';
import { problemFixture, problem, publishedVersion } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('getProblemVersions delegates authenticated ownership and returns the expected contract', async () => {
  const { context, problems, user } = problemFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { problemId: problem.id },
    body: undefined,
    query: {},
  } as unknown as FastifyRequest;
  const result = await getProblemVersionsHandler(context)(request);
  expect(result).toEqual({ versions: [publishedVersion], nextOffset: null });
  expect(problems.listVersions).toHaveBeenCalledWith(user.id, problem.id, 21, 0);
});

test.each([0, 1, 2, 3])(
  'publication page with %i rows trims lookahead and distinguishes empty from missing parents',
  async (count) => {
    const { context, problems, user } = problemFixture();
    const rows = Array.from({ length: count }, (_, index) => ({
      ...publishedVersion,
      version: 9 - index,
    }));
    problems.listVersions.mockResolvedValue(rows);
    const request = {
      cookies: { logiclab_session: sessionId },
      params: { problemId: problem.id },
      query: { limit: '2', offset: '4' },
    } as unknown as FastifyRequest;
    const handler = getProblemVersionsHandler(context);
    expect(await handler(request)).toEqual({
      versions: rows.slice(0, 2),
      nextOffset: count > 2 ? 6 : null,
    });
    expect(problems.listVersions).toHaveBeenCalledWith(user.id, problem.id, 3, 4);
  },
);
