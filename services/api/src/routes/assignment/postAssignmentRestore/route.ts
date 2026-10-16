import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  assignmentActionRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { postAssignmentRestoreHandler } from './handler';

export const postAssignmentRestoreSchema = {
  summary: 'Restore an assignment',
  description: 'Instructor-only authoring; student assignment access is introduced separately.',
  params: assignmentParamsSchema,
  body: assignmentActionRequestSchema,
  response: { 200: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function postAssignmentRestoreRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'POST',
    url: '/api/assignments/:assignmentId/restore',
    schema: postAssignmentRestoreSchema,
    handler: postAssignmentRestoreHandler(context),
  });
}
