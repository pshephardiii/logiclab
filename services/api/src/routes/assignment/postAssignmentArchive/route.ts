import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  assignmentActionRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../schemas';
import { postAssignmentArchiveHandler } from './handler';

export const postAssignmentArchiveSchema = {
  summary: 'Archive an assignment',
  description: 'Instructor-only authoring; student assignment access is introduced separately.',
  params: assignmentParamsSchema,
  body: assignmentActionRequestSchema,
  response: { 200: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function postAssignmentArchiveRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'POST',
    url: '/api/assignments/:assignmentId/archive',
    schema: postAssignmentArchiveSchema,
    handler: postAssignmentArchiveHandler(context),
  });
}
