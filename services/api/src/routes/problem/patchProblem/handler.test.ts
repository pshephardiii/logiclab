import { patchProblemHandler } from './handler';
import { problemFixture, problem, draftInput } from '../../../../test/problem-fixture';
import type { FastifyRequest } from 'fastify';
import { sessionId } from '../../../../test/auth-fixture';
test('partial edit keeps authenticated ownership and explicit instruction clearing', async () => {
  const { context, problems, user } = problemFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { problemId: problem.id },
    body: { instructions: null },
  } as unknown as FastifyRequest;
  expect(await patchProblemHandler(context)(request, {} as never)).toEqual({ problem });
  expect(problems.update).toHaveBeenCalledWith(user.id, problem.id, { instructions: null });
});
test.each([
  ['not_found', 404],
  ['archived', 409],
] as const)('maps update result %s', async (status, expected) => {
  const { context, problems } = problemFixture();
  problems.update.mockResolvedValue({ status });
  await expect(
    patchProblemHandler(context)(
      {
        cookies: { logiclab_session: sessionId },
        params: { problemId: problem.id },
        body: { title: 'Changed' },
      } as unknown as FastifyRequest,
      {} as never,
    ),
  ).rejects.toMatchObject({ status: expected });
});
