import type { FastifyRequest } from 'fastify';
import { submissionParamsSchema, submissionGradingResponseSchema } from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getSubmissionGradingHandler(context: AssignmentContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { assignmentId, submissionId } = parseRequest(submissionParamsSchema, request.params);
    const result = await context.submissionGrading.read(user.id, assignmentId, submissionId);
    return submissionGradingResponseSchema.parse(result);
  };
}
