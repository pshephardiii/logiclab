import type { FastifyRequest } from 'fastify';
import {
  studentClassParamsSchema,
  studentAssignmentListResponseSchema,
  studentAssignmentListQuerySchema,
} from '@logiclab/contracts';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getStudentAssignmentsHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { classId } = parseRequest(studentClassParamsSchema, request.params);
    const query = parseRequest(studentAssignmentListQuerySchema, request.query);
    const rows = await context.studentWork.list(user.id, classId, {
      ...query,
      limit: query.limit + 1,
    });
    return studentAssignmentListResponseSchema.parse({
      assignments: rows.slice(0, query.limit),
      nextOffset: rows.length > query.limit ? query.offset + query.limit : null,
    });
  };
}
