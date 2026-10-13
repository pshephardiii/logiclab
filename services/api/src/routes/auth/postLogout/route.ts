import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postLogoutHandler } from './handler';

export async function postLogoutRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/logout', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postLogoutHandler(context) });
}
