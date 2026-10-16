import { joinClassroomRequestSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import { classroomErrorResponses } from '../../error-responses';
import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { postEnrollmentHandler } from './handler';

export const postEnrollmentSchema = {
  summary: 'Join a class',
  description: 'Redeem a current invitation as a student; duplicate enrollment is safe.',
  body: joinClassroomRequestSchema,
  response: { 200: classroomResponseSchema, ...classroomErrorResponses },
} satisfies RouteSchema;

export async function postEnrollmentRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({
    method: 'POST',
    url: '/api/enrollments',
    schema: postEnrollmentSchema,
    handler: postEnrollmentHandler(context),
  });
}
