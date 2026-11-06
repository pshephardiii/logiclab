import type { FastifyRequest } from 'fastify';
import { studentAssignmentParamsSchema } from '@logiclab/contracts';
import {
  savedStudentCheckSchema,
  savedStudentCheckResponseSchema,
} from '@logiclab/contracts/saved-student-work';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postStudentCheckHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId } = parseRequest(studentAssignmentParamsSchema, request.params);
    const input = parseRequest(savedStudentCheckSchema, request.body);

    return savedStudentCheckResponseSchema.parse(
      await context.studentWork.check(user.id, assignmentId, input),
    );
  };
}
