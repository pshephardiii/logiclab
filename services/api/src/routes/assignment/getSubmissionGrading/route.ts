import type { FastifyInstance } from 'fastify';
import { submissionParamsSchema, submissionGradingResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { getSubmissionGradingHandler } from './handler';

export const getSubmissionGradingSchema = {
  summary: 'Read instructor grading',
  description:
    'Owner-only final-submission grading; automatic evidence and independent release policies are preserved.',
  params: submissionParamsSchema,
  response: { 200: submissionGradingResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function getSubmissionGradingRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'GET',
    url: '/api/assignments/:assignmentId/submissions/:submissionId/grading',
    schema: getSubmissionGradingSchema,
    handler: getSubmissionGradingHandler(context),
  });
}
