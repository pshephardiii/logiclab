import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getEnrollmentsHandler } from './handler';
export async function getEnrollmentsRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'GET', url: '/api/enrollments', config: { rateLimit: { max: 60, timeWindow: '1 minute' } }, handler: getEnrollmentsHandler(context) });
}
