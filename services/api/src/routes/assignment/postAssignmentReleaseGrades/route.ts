import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  assignmentActionRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { postAssignmentReleaseGradesHandler } from './handler';

export const postAssignmentReleaseGradesSchema = {
  summary: 'Release assignment grades',
  description:
    'Owner-authorized independent release; repeated requests retain the original release metadata.',
  params: assignmentParamsSchema,
  body: assignmentActionRequestSchema,
  response: { 200: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function postAssignmentReleaseGradesRoute(
  app: FastifyInstance,
  context: AssignmentContext,
) {
  app.route({
    method: 'POST',
    url: '/api/assignments/:assignmentId/release-grades',
    schema: postAssignmentReleaseGradesSchema,
    handler: postAssignmentReleaseGradesHandler(context),
  });
}
