import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { getSessionHandler } from './handler';

export async function getSessionRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'GET', url: '/api/auth/session', config: { rateLimit: { max: 60, timeWindow: '1 minute' } }, handler: getSessionHandler(context) });
}
