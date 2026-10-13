import { classroomParamsSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import { classroomErrorResponses } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getClassroomHandler } from './handler';

export const getClassroomSchema = {
  summary: 'Read an owned class',
  description: 'Read a class only when the signed-in instructor owns it.',
  params: classroomParamsSchema,
  response: { 200: classroomResponseSchema, ...classroomErrorResponses },
} satisfies RouteSchema;

export async function getClassroomRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'GET', url: '/api/classes/:classId', schema: getClassroomSchema, handler: getClassroomHandler(context) });
}
