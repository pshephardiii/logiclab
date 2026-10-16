import type { FastifyRequest, FastifyReply } from 'fastify';
import { postAssignmentArchiveHandler } from './handler';
import {
  assignmentFixture,
  assignment,
  assignmentSummary,
  classId,
} from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates normalized fields and authenticated ownership for postAssignmentArchive', async () => {
  const { context, assignments, user } = assignmentFixture();
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((value) => value),
  };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id },
    query: {},
    body: {},
  } as unknown as FastifyRequest;
  const result = await postAssignmentArchiveHandler(context)(
    request,
    reply as unknown as FastifyReply,
  );
  expect(assignments.setArchived).toHaveBeenCalledWith(user.id, assignment.id, true);
  expect(result).toEqual({ assignment });
});
