import type { FastifyRequest, FastifyReply } from 'fastify';
import { postAssignmentHandler } from './handler';
import {
  assignmentFixture,
  assignment,
  assignmentSummary,
  classId,
} from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates normalized fields and authenticated ownership for postAssignment', async () => {
  const { context, assignments, user } = assignmentFixture();
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((value) => value),
  };
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { classId },
    query: {},
    body: { title: '  Homework  ' },
  } as unknown as FastifyRequest;
  const result = await postAssignmentHandler(context)(request, reply as unknown as FastifyReply);
  expect(assignments.create).toHaveBeenCalledWith(user.id, classId, {
    title: 'Homework',
    problemVersionIds: [],
    assessmentMode: 'graded',
    feedbackTiming: 'on_submission',
    allowSolutions: false,
  });
  expect(result).toEqual({ assignment });
});
