import type { FastifyInstance } from 'fastify';
import {
  submissionParamsSchema,
  submissionGradingHistorySchema,
  submissionListQuerySchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { getSubmissionGradingHistoryHandler } from './handler';

export const getSubmissionGradingHistorySchema = {
  summary: 'Read instructor grading history',
  description:
    'Owner-only final-submission grading; automatic evidence and independent release policies are preserved.',
  params: submissionParamsSchema,
  querystring: submissionListQuerySchema,
  response: { 200: submissionGradingHistorySchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function getSubmissionGradingHistoryRoute(
  app: FastifyInstance,
  context: AssignmentContext,
) {
  app.route({
    method: 'GET',
    url: '/api/assignments/:assignmentId/submissions/:submissionId/grading/history',
    schema: getSubmissionGradingHistorySchema,
    handler: getSubmissionGradingHistoryHandler(context),
  });
}
