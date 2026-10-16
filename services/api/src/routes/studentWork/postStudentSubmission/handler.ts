import type { FastifyRequest } from 'fastify';
import {
  studentAssignmentParamsSchema,
  studentAttemptResponseSchema,
  submitStudentAttemptSchema,
} from '@logiclab/contracts';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postStudentSubmissionHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId } = parseRequest(studentAssignmentParamsSchema, request.params);
    const input = parseRequest(submitStudentAttemptSchema, request.body);
    const attempt = await context.studentWork.submit(user.id, assignmentId, input.revision);
    return studentAttemptResponseSchema.parse({ attempt });
  };
}
