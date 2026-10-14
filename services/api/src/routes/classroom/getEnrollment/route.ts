import { classroomParamsSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import { classroomErrorResponses } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getEnrollmentHandler } from './handler';

export const getEnrollmentSchema = {
  summary: 'Read an enrolled class',
  description: 'Read a class only when the signed-in student is enrolled.',
  params: classroomParamsSchema,
  response: { 200: classroomResponseSchema, ...classroomErrorResponses },
} satisfies RouteSchema;

export async function getEnrollmentRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({
    method: 'GET',
    url: '/api/enrollments/:classId',
    schema: getEnrollmentSchema,
    handler: getEnrollmentHandler(context),
  });
}
