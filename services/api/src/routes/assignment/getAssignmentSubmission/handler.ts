import type { FastifyRequest } from 'fastify';
import { submissionParamsSchema, submissionReviewSchema } from '@logiclab/contracts';
import type { AssignmentContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getAssignmentSubmissionHandler(context: AssignmentContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { assignmentId, submissionId } = parseRequest(submissionParamsSchema, request.params);
    return submissionReviewSchema.parse(
      await context.assignments.findSubmission(user.id, assignmentId, submissionId),
    );
  };
}
