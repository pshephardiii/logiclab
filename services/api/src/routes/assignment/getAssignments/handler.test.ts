import type { FastifyRequest, FastifyReply } from 'fastify';
import { getAssignmentsHandler } from './handler';
import {
  assignmentFixture,
  assignment,
  assignmentSummary,
  classId,
} from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates normalized fields and authenticated ownership for getAssignments', async () => {
  const { context, assignments, user } = assignmentFixture();
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((value) => value),
  };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { classId },
    query: {},
    body: undefined,
  } as unknown as FastifyRequest;
  const result = await getAssignmentsHandler(context)(request, reply as unknown as FastifyReply);
  expect(assignments.list).toHaveBeenCalledWith(user.id, classId, {
    archive: 'active',
    limit: 21,
    offset: 0,
  });
  expect(result).toEqual({ assignments: [assignmentSummary], nextOffset: null });
});

test.each([0, 1, 2, 3])(
  'assignment page with %i fetched rows trims lookahead and stops at the final page',
  async (count) => {
    const { context, assignments, user } = assignmentFixture();
    const rows = Array.from({ length: count }, (_, index) => ({
      ...assignmentSummary,
      title: `Assignment ${index}`,
    }));
    assignments.list.mockResolvedValue(rows);
    const result = await getAssignmentsHandler(context)(
      {
        cookies: { logiclab_session: sessionId },
        params: { classId },
        query: { limit: '2', offset: '4', archive: 'all' },
      } as unknown as FastifyRequest,
      {} as FastifyReply,
    );
    expect(result).toEqual({ assignments: rows.slice(0, 2), nextOffset: count > 2 ? 6 : null });
    expect(assignments.list).toHaveBeenCalledWith(user.id, classId, {
      limit: 3,
      offset: 4,
      archive: 'all',
    });
  },
);
