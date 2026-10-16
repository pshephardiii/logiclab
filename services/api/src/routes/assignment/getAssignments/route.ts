import type { FastifyInstance } from 'fastify';
import {
  assignmentClassParamsSchema,
  assignmentListResponseSchema,
  assignmentListQuerySchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../schemas';
import { getAssignmentsHandler } from './handler';

export const getAssignmentsSchema = {
  summary: 'List owned class assignments',
  description: 'Instructor-only authoring; student assignment access is introduced separately.',
  params: assignmentClassParamsSchema,
  querystring: assignmentListQuerySchema,
  response: { 200: assignmentListResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function getAssignmentsRoute(app: FastifyInstance, context: AssignmentContext) {
  app.route({
    method: 'GET',
    url: '/api/classes/:classId/assignments',
    schema: getAssignmentsSchema,
    handler: getAssignmentsHandler(context),
  });
}
