import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { getClassroomHandler } from './handler';

export async function getClassroomRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'GET', url: '/api/classes/:classId', config: { rateLimit: { max: 60, timeWindow: '1 minute' } }, handler: getClassroomHandler(context) });
}
