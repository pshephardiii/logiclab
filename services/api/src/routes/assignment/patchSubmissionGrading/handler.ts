import type { FastifyRequest } from 'fastify';
import {
  submissionParamsSchema,
  submissionGradingResponseSchema,
  updateSubmissionGradingSchema,
} from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function patchSubmissionGradingHandler(context: AssignmentContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { assignmentId, submissionId } = parseRequest(submissionParamsSchema, request.params);
    const input = parseRequest(updateSubmissionGradingSchema, request.body);

    const result = await context.submissionGrading.update(
      user.id,
      assignmentId,
      submissionId,
      input,
    );

    return submissionGradingResponseSchema.parse(result);
  };
}
