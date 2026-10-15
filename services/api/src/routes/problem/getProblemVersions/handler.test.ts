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
