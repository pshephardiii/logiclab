import { getProblemHandler } from './handler';
import { problemFixture, problem, draftInput } from '../../../../test/problem-fixture';
import type { FastifyRequest } from 'fastify';
import { sessionId } from '../../../../test/auth-fixture';
test('detail scopes ownership and hides absent or foreign records', async () => {
  const { context, problems, user } = problemFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { problemId: problem.id },
  } as unknown as FastifyRequest;
  expect(await getProblemHandler(context)(request, {} as never)).toEqual({ problem });
  expect(problems.findOwned).toHaveBeenCalledWith(user.id, problem.id);
  problems.findOwned.mockResolvedValue(null);
  await expect(getProblemHandler(context)(request, {} as never)).rejects.toMatchObject({
    status: 404,
    code: 'PROBLEM_NOT_FOUND',
  });
});
