import { classroomListQuerySchema, classroomListResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import { classroomErrorResponses } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getClassroomsHandler } from './handler';

export const getClassroomsSchema = {
  summary: 'List owned classes',
  description: 'Read a paginated list scoped to the signed-in instructor.',
  querystring: classroomListQuerySchema,
  response: { 200: classroomListResponseSchema, ...classroomErrorResponses },
} satisfies RouteSchema;

export async function getClassroomsRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({
    method: 'GET',
    url: '/api/classes',
    schema: getClassroomsSchema,
    handler: getClassroomsHandler(context),
  });
}
