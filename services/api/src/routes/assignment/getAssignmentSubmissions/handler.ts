import type { FastifyRequest } from 'fastify';
import {
  assignmentParamsSchema,
  submissionListResponseSchema,
  submissionListQuerySchema,
} from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getAssignmentSubmissionsHandler(context: AssignmentContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { assignmentId } = parseRequest(assignmentParamsSchema, request.params);
    const query = parseRequest(submissionListQuerySchema, request.query);
    const rows = await context.assignments.listSubmissions(user.id, assignmentId, {
      ...query,
      limit: query.limit + 1,
    });
    return submissionListResponseSchema.parse({
      submissions: rows.slice(0, query.limit),
      nextOffset: rows.length > query.limit ? query.offset + query.limit : null,
    });
  };
}
