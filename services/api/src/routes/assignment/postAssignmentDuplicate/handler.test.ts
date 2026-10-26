import type { FastifyRequest, FastifyReply } from 'fastify';
import { postAssignmentDuplicateHandler } from './handler';
import { assignmentFixture, assignment } from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('duplicates using authenticated ownership and returns the new draft with status 201', async () => {
  const { context, assignments, user } = assignmentFixture();
  const reply = { code: jest.fn().mockReturnThis() };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { assignmentId: assignment.id },
    body: {},
  } as unknown as FastifyRequest;
  const result = await postAssignmentDuplicateHandler(context)(
    request,
    reply as unknown as FastifyReply,
  );
  expect(assignments.duplicate).toHaveBeenCalledTimes(1);
  expect(assignments.duplicate).toHaveBeenCalledWith(user.id, assignment.id);
  expect(reply.code).toHaveBeenCalledWith(201);
  expect(result.assignment.id).not.toBe(assignment.id);
  expect(result.assignment.title).toBe('Copy of Conjunction assignment');
  expect(result.assignment.publishedAt).toBeNull();
  expect(result.assignment.archivedAt).toBeNull();
});
