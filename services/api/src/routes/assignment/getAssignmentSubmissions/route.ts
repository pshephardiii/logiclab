import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  submissionListResponseSchema,
  submissionListQuerySchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { getAssignmentSubmissionsHandler } from './handler';

export const getAssignmentSubmissionsSchema = {
  summary: 'Read final assignment submissions',
  description: 'Owner-scoped final submissions only; unsubmitted answers remain private.',
  params: assignmentParamsSchema,
  querystring: submissionListQuerySchema,
  response: { 200: submissionListResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;
export async function getAssignmentSubmissionsRoute(
  app: FastifyInstance,
  context: AssignmentContext,
) {
  app.route({
    method: 'GET',
    url: '/api/assignments/:assignmentId/submissions',
    schema: getAssignmentSubmissionsSchema,
    handler: getAssignmentSubmissionsHandler(context),
  });
}
