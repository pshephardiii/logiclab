import { getProblemsHandler } from './handler';
import { problemFixture, problem, draftInput } from '../../../../test/problem-fixture';
import type { FastifyRequest } from 'fastify';
import { sessionId } from '../../../../test/auth-fixture';
test.each([0, 1, 2, 3])('lists bounded owner-scoped pages with %i fetched rows', async (count) => {
  const { context, problems, user } = problemFixture();
  problems.list.mockResolvedValue(Array.from({ length: count }, () => problem));
  const response = await getProblemsHandler(context)(
    {
      cookies: { logiclab_session: sessionId },
      query: { limit: '2', offset: '4' },
    } as unknown as FastifyRequest,
    {} as never,
  );
  expect(response).toEqual({
    problems: Array.from({ length: Math.min(count, 2) }, () => problem),
    nextOffset: count > 2 ? 6 : null,
  });
  expect(problems.list).toHaveBeenCalledWith(user.id, 3, 4, 'active');
});
