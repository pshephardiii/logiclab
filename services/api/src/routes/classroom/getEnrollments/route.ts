import { classroomListQuerySchema, classroomListResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import { classroomErrorResponses } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getEnrollmentsHandler } from './handler';

export const getEnrollmentsSchema = {
  summary: 'List enrolled classes',
  description: 'Read a paginated list scoped to the signed-in student.',
  querystring: classroomListQuerySchema,
  response: { 200: classroomListResponseSchema, ...classroomErrorResponses },
} satisfies RouteSchema;

export async function getEnrollmentsRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({
    method: 'GET',
    url: '/api/enrollments',
    schema: getEnrollmentsSchema,
    handler: getEnrollmentsHandler(context),
  });
}
