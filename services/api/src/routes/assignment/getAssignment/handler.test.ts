import type { FastifyRequest, FastifyReply } from 'fastify';
import { getAssignmentHandler } from './handler';
import {
  assignmentFixture,
  assignment,
  assignmentSummary,
  classId,
} from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates normalized fields and authenticated ownership for getAssignment', async () => {
  const { context, assignments, user } = assignmentFixture();
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((value) => value),
  };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id },
    query: {},
    body: undefined,
  } as unknown as FastifyRequest;
  const result = await getAssignmentHandler(context)(request, reply as unknown as FastifyReply);
  expect(assignments.findOwned).toHaveBeenCalledWith(user.id, assignment.id);
  expect(result).toEqual({ assignment });
});
