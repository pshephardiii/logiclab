import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postResendHandler } from './handler';

export async function postResendRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/resend', config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, handler: postResendHandler(context) });
}
