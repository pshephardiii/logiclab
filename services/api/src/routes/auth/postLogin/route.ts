import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postLoginHandler } from './handler';

export async function postLoginRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/login', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postLoginHandler(context) });
}
