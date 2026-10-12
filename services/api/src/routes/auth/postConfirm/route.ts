import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postConfirmHandler } from './handler';

export async function postConfirmRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/confirm', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postConfirmHandler(context) });
}
