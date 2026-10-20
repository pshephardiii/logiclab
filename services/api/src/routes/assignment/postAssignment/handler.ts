import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  assignmentClassParamsSchema,
  assignmentResponseSchema,
  createAssignmentRequestSchema,
} from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postAssignmentHandler(context: AssignmentContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { classId } = parseRequest(assignmentClassParamsSchema, request.params);
    const input = parseRequest(createAssignmentRequestSchema, request.body);
    const assignment = await context.assignments.create(user.id, classId, input);
    reply.code(201);
    return assignmentResponseSchema.parse({ assignment });
  };
}
