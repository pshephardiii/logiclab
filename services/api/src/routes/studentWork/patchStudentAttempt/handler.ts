import type { FastifyRequest } from 'fastify';
import {
  studentAssignmentParamsSchema,
  studentAttemptResponseSchema,
  saveStudentAnswersSchema,
} from '@logiclab/contracts';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function patchStudentAttemptHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId } = parseRequest(studentAssignmentParamsSchema, request.params);
    const input = parseRequest(saveStudentAnswersSchema, request.body);
    const attempt = await context.studentWork.save(user.id, assignmentId, input);
    return studentAttemptResponseSchema.parse({ attempt });
  };
}
