import { loginRequestSchema, authUserResponseSchema } from '@logiclab/contracts';
import { authErrorResponses, type AuthRouteSchema } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postLoginHandler } from './handler';

export const postLoginSchema = {
  summary: 'Sign in',
  description: 'Create an opaque cookie session and return the stored public user ID and role.',
  body: loginRequestSchema,
  response: { 200: authUserResponseSchema, ...authErrorResponses },
} satisfies AuthRouteSchema;

export async function postLoginRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/login', schema: postLoginSchema, handler: postLoginHandler(context) });
}
