import type { FastifyRequest } from 'fastify';
import { studentAssignmentParamsSchema } from '@logiclab/contracts';
import { savedStudentAssignmentResponseSchema } from '@logiclab/contracts/saved-student-work';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getStudentAssignmentHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId } = parseRequest(studentAssignmentParamsSchema, request.params);

    return savedStudentAssignmentResponseSchema.parse(
      await context.studentWork.read(user.id, assignmentId),
    );
  };
}
