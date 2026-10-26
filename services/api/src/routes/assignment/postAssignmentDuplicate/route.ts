import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  assignmentActionRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { postAssignmentDuplicateHandler } from './handler';

export const postAssignmentDuplicateSchema = {
  summary: 'Duplicate an assignment as a draft',
  description:
    'Copy saved owned content and pinned problem occurrences into a new same-class draft. Each request creates a distinct copy.',
  params: assignmentParamsSchema,
  body: assignmentActionRequestSchema,
  response: { 201: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function postAssignmentDuplicateRoute(
  app: FastifyInstance,
  context: AssignmentContext,
) {
  app.route({
    method: 'POST',
    url: '/api/assignments/:assignmentId/duplicate',
    schema: postAssignmentDuplicateSchema,
    handler: postAssignmentDuplicateHandler(context),
  });
}
