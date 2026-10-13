import { authUserResponseSchema } from '@logiclab/contracts';
import { authErrorResponses, type AuthRouteSchema } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { getSessionHandler } from './handler';

export const getSessionSchema = {
  summary: 'Read the current session',
  description: 'Restore the signed-in user, refreshing backend tokens when required.',
  response: { 200: authUserResponseSchema, ...authErrorResponses },
} satisfies AuthRouteSchema;

export async function getSessionRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'GET', url: '/api/auth/session', schema: getSessionSchema, handler: getSessionHandler(context) });
}
