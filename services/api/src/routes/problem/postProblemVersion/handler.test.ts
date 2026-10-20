import type { FastifyRequest, FastifyReply } from 'fastify';
import { postProblemVersionHandler } from './handler';
import { problemFixture, problem, publishedVersion } from '../../../../test/problem-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('postProblemVersion delegates authenticated ownership and returns the expected contract', async () => {
  const { context, problems, user } = problemFixture();
  const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { problemId: problem.id },
    body: {},
    query: {},
  } as unknown as FastifyRequest;
  const result = await postProblemVersionHandler(context)(
    request,
    reply as unknown as FastifyReply,
  );
  expect(reply.code).toHaveBeenCalledWith(201);
  expect(result).toEqual({ version: publishedVersion });
  expect(problems.publish).toHaveBeenCalledWith(user.id, problem.id);
});
