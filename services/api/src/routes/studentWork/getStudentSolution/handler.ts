import type { FastifyRequest } from 'fastify';
import { studentItemParamsSchema, studentSolutionResponseSchema } from '@logiclab/contracts';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getStudentSolutionHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId, itemId } = parseRequest(studentItemParamsSchema, request.params);
    return studentSolutionResponseSchema.parse(
      await context.studentWork.solution(user.id, assignmentId, itemId),
    );
  };
}
