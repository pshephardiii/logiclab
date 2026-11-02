import type { FastifyRequest } from 'fastify';
import { studentItemParamsSchema } from '@logiclab/contracts';
import { savedStudentSolutionResponseSchema } from '@logiclab/contracts/saved-student-work';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getStudentSolutionHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId, itemId } = parseRequest(studentItemParamsSchema, request.params);
    return savedStudentSolutionResponseSchema.parse(
      await context.studentWork.solution(user.id, assignmentId, itemId),
    );
  };
}
