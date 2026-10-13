import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { postEnrollmentHandler } from './handler';
export async function postEnrollmentRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'POST', url: '/api/enrollments', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postEnrollmentHandler(context) });
}
