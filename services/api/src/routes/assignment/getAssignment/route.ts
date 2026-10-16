import type { FastifyInstance } from 'fastify';
import { assignmentParamsSchema, assignmentResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { getAssignmentHandler } from './handler';

export const getAssignmentSchema = {
  summary: 'Read an owned assignment',
  description: 'Instructor-only authoring; student assignment access is introduced separately.',
  params: assignmentParamsSchema,
  response: { 200: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function getAssignmentRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'GET',
    url: '/api/assignments/:assignmentId',
    schema: getAssignmentSchema,
    handler: getAssignmentHandler(context),
  });
}
