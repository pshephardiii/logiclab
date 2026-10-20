import type { FastifyRequest, FastifyReply } from 'fastify';
import { assignmentParamsSchema, assignmentResponseSchema } from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getAssignmentHandler(context: AssignmentContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { assignmentId } = parseRequest(assignmentParamsSchema, request.params);
    const assignment = await context.assignments.findOwned(user.id, assignmentId);
    reply.code(200);
    return assignmentResponseSchema.parse({ assignment });
  };
}
