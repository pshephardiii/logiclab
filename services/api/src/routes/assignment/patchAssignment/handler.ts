import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  updateAssignmentRequestSchema,
} from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function patchAssignmentHandler(context: AssignmentContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { assignmentId } = parseRequest(assignmentParamsSchema, request.params);
    const input = parseRequest(updateAssignmentRequestSchema, request.body);
    const assignment = await context.assignments.update(user.id, assignmentId, input);
    return reply.code(200).send(assignmentResponseSchema.parse({ assignment }));
  };
}
