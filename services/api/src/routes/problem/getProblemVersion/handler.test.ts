import type { FastifyRequest } from 'fastify';
import { getProblemVersionHandler } from './handler';
import { problemFixture, problem, publishedVersion } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('getProblemVersion delegates authenticated ownership and returns the expected contract', async () => {
  const { context, problems, user } = problemFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { problemId: problem.id, version: '1' },
    body: undefined,
    query: {},
  } as unknown as FastifyRequest;
  const result = await getProblemVersionHandler(context)(request);
  expect(result).toEqual({ version: publishedVersion });
  expect(problems.findVersion).toHaveBeenCalledWith(user.id, problem.id, 1);
});
