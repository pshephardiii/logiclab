import type { FastifyInstance } from 'fastify';
import {
  submissionParamsSchema,
  submissionGradingResponseSchema,
  updateSubmissionGradingSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { patchSubmissionGradingHandler } from './handler';

export const patchSubmissionGradingSchema = {
  summary: 'Update instructor grading',
  description:
    'Owner-only final-submission grading; automatic evidence and independent release policies are preserved.',
  params: submissionParamsSchema,
  body: updateSubmissionGradingSchema,
  response: { 200: submissionGradingResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function patchSubmissionGradingRoute(
  app: FastifyInstance,
  context: AssignmentContext,
) {
  app.route({
    method: 'PATCH',
    url: '/api/assignments/:assignmentId/submissions/:submissionId/grading',
    schema: patchSubmissionGradingSchema,
    handler: patchSubmissionGradingHandler(context),
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  });
}
