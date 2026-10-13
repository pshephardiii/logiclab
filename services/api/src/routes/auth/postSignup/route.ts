import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postSignupHandler } from './handler';

export async function postSignupRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/signup', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postSignupHandler(context) });
}
