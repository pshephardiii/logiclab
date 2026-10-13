import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getClassroomsHandler } from './handler';

export async function getClassroomsRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'GET', url: '/api/classes', config: { rateLimit: { max: 60, timeWindow: '1 minute' } }, handler: getClassroomsHandler(context) });
}
