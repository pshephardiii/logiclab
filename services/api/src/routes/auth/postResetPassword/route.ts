import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postResetPasswordHandler } from './handler';

export async function postResetPasswordRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/reset-password', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postResetPasswordHandler(context) });
}
