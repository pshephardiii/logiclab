import type { FastifyInstance } from 'fastify';
import {
  assignmentClassParamsSchema,
  assignmentResponseSchema,
  createAssignmentRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { postAssignmentHandler } from './handler';

export const postAssignmentSchema = {
  summary: 'Create an assignment draft',
  description: 'Instructor-only authoring; student assignment access is introduced separately.',
  params: assignmentClassParamsSchema,
  body: createAssignmentRequestSchema,
  response: { 201: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function postAssignmentRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'POST',
    url: '/api/classes/:classId/assignments',
    schema: postAssignmentSchema,
    handler: postAssignmentHandler(context),
  });
}
