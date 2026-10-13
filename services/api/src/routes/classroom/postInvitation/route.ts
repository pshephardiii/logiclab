import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { postInvitationHandler } from './handler';
export async function postInvitationRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'POST', url: '/api/classes/:classId/invitation', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postInvitationHandler(context) });
}
