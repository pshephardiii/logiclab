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
