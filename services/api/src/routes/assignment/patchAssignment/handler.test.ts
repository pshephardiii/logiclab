import type { FastifyRequest, FastifyReply } from 'fastify';
import { patchAssignmentHandler } from './handler';
import {
  assignmentFixture,
  assignment,
  assignmentSummary,
  classId,
} from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates normalized fields and authenticated ownership for patchAssignment', async () => {
  const { context, assignments, user } = assignmentFixture();
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((value) => value),
  };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id },
    query: {},
    body: { title: 'Revised' },
  } as unknown as FastifyRequest;
  const result = await patchAssignmentHandler(context)(request, reply as unknown as FastifyReply);
  expect(assignments.update).toHaveBeenCalledWith(user.id, assignment.id, { title: 'Revised' });
  expect(result).toEqual({ assignment });
});
