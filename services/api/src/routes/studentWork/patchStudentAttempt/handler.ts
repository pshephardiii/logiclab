import type { FastifyRequest } from 'fastify';
import { studentAssignmentParamsSchema } from '@logiclab/contracts';
import {
  savedStudentAttemptResponseSchema,
  savedStudentAnswersSchema,
} from '@logiclab/contracts/saved-student-work';
import type { StudentWorkContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function patchStudentAttemptHandler(context: StudentWorkContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { assignmentId } = parseRequest(studentAssignmentParamsSchema, request.params);
    const input = parseRequest(savedStudentAnswersSchema, request.body);
    const attempt = await context.studentWork.save(user.id, assignmentId, input);
    return savedStudentAttemptResponseSchema.parse({ attempt });
  };
}
