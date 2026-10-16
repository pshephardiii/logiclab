import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  assignmentActionRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../schemas';
import { postAssignmentPublishHandler } from './handler';

export const postAssignmentPublishSchema = {
  summary: 'Publish an assignment',
  description: 'Instructor-only authoring; student assignment access is introduced separately.',
  params: assignmentParamsSchema,
  body: assignmentActionRequestSchema,
  response: { 200: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function postAssignmentPublishRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'POST',
    url: '/api/assignments/:assignmentId/publish',
    schema: postAssignmentPublishSchema,
    handler: postAssignmentPublishHandler(context),
  });
}
