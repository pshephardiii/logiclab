import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getEnrollmentHandler } from './handler';
export async function getEnrollmentRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'GET', url: '/api/enrollments/:classId', config: { rateLimit: { max: 60, timeWindow: '1 minute' } }, handler: getEnrollmentHandler(context) });
}
