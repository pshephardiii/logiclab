import type { FastifyRequest } from 'fastify';
import {
  studentAssignmentParamsSchema,
  studentAssignmentResponseSchema,
} from '@logiclab/contracts';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getStudentAssignmentHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId } = parseRequest(studentAssignmentParamsSchema, request.params);
    return studentAssignmentResponseSchema.parse(
      await context.studentWork.read(user.id, assignmentId),
    );
  };
}
