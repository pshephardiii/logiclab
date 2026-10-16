import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  updateAssignmentRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { patchAssignmentHandler } from './handler';

export const patchAssignmentSchema = {
  summary: 'Edit an unpublished assignment',
  description: 'Instructor-only authoring; student assignment access is introduced separately.',
  params: assignmentParamsSchema,
  body: updateAssignmentRequestSchema,
  response: { 200: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function patchAssignmentRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'PATCH',
    url: '/api/assignments/:assignmentId',
    schema: patchAssignmentSchema,
    handler: patchAssignmentHandler(context),
  });
}
