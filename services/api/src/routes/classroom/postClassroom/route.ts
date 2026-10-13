import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { postClassroomHandler } from './handler';

export async function postClassroomRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'POST', url: '/api/classes', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postClassroomHandler(context) });
}
