import type { FastifyRequest } from 'fastify';
import {
  submissionParamsSchema,
  submissionGradingHistorySchema,
  submissionListQuerySchema,
} from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getSubmissionGradingHistoryHandler(context: AssignmentContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { assignmentId, submissionId } = parseRequest(submissionParamsSchema, request.params);
    const input = parseRequest(submissionListQuerySchema, request.query);
    const result = await context.submissionGrading.history(
      user.id,
      assignmentId,
      submissionId,
      input,
    );
    return submissionGradingHistorySchema.parse(result);
  };
}
