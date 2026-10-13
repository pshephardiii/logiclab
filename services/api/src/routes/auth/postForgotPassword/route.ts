import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postForgotPasswordHandler } from './handler';

export async function postForgotPasswordRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/forgot-password', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postForgotPasswordHandler(context) });
}
