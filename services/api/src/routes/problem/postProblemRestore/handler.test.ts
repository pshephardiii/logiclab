import type { FastifyRequest, FastifyReply } from 'fastify';
import { postProblemRestoreHandler } from './handler';
import { problemFixture, problem, publishedVersion } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('postProblemRestore delegates authenticated ownership and returns the expected contract', async () => {
  const { context, problems, user } = problemFixture();
  const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { problemId: problem.id },
    body: {},
    query: {},
  } as unknown as FastifyRequest;
  const result = await postProblemRestoreHandler(context)(
    request,
    reply as unknown as FastifyReply,
  );
  expect(result).toEqual({ problem });
  expect(problems.setArchived).toHaveBeenCalledWith(user.id, problem.id, false);
});
