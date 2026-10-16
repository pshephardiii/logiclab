import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  assignmentClassParamsSchema,
  assignmentListResponseSchema,
  assignmentListQuerySchema,
} from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getAssignmentsHandler(context: AssignmentContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { classId } = parseRequest(assignmentClassParamsSchema, request.params);
    const query = parseRequest(assignmentListQuerySchema, request.query);
    const rows = await context.assignments.list(user.id, classId, {
      ...query,
      limit: query.limit + 1,
    });
    return assignmentListResponseSchema.parse({
      assignments: rows.slice(0, query.limit),
      nextOffset: rows.length > query.limit ? query.offset + query.limit : null,
    });
  };
}
