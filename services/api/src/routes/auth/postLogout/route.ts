import { emptyAuthRequestSchema, authMessageResponseSchema } from '@logiclab/contracts';
import { authErrorResponses, type AuthRouteSchema } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postLogoutHandler } from './handler';

export const postLogoutSchema = {
  summary: 'Sign out',
  description: 'Clear the browser cookie and retire the local session and provider tokens.',
  body: emptyAuthRequestSchema.nullish().transform(value => value ?? {}),
  response: { 200: authMessageResponseSchema, ...authErrorResponses },
} satisfies AuthRouteSchema;

export async function postLogoutRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/logout', schema: postLogoutSchema, handler: postLogoutHandler(context) });
}
