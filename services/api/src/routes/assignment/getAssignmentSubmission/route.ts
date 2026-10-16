import type { FastifyInstance } from 'fastify';
import { submissionParamsSchema, submissionReviewSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { getAssignmentSubmissionHandler } from './handler';

export const getAssignmentSubmissionSchema = {
  summary: 'Read final assignment submissions',
  description: 'Owner-scoped final submissions only; unsubmitted answers remain private.',
  params: submissionParamsSchema,
  response: { 200: submissionReviewSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;
export async function getAssignmentSubmissionRoute(
  app: FastifyInstance,
  context: AssignmentContext,
) {
  app.route({
    method: 'GET',
    url: '/api/assignments/:assignmentId/submissions/:submissionId',
    schema: getAssignmentSubmissionSchema,
    handler: getAssignmentSubmissionHandler(context),
  });
}
