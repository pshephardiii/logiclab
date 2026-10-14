import { createClassroomRequestSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import { classroomErrorResponses } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { postClassroomHandler } from './handler';

export const postClassroomSchema = {
  summary: 'Create a class',
  description: 'Create an instructor-owned class.',
  body: createClassroomRequestSchema,
  response: { 201: classroomResponseSchema, ...classroomErrorResponses },
} satisfies RouteSchema;

export async function postClassroomRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({
    method: 'POST',
    url: '/api/classes',
    schema: postClassroomSchema,
    handler: postClassroomHandler(context),
  });
}
