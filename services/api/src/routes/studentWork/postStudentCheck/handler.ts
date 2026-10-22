import type { FastifyRequest } from 'fastify';
import {
  studentAssignmentParamsSchema,
  checkStudentAnswersSchema,
  studentCheckResponseSchema,
} from '@logiclab/contracts';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postStudentCheckHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId } = parseRequest(studentAssignmentParamsSchema, request.params);
    const input = parseRequest(checkStudentAnswersSchema, request.body);
    return studentCheckResponseSchema.parse(
      await context.studentWork.check(user.id, assignmentId, input),
    );
  };
}
