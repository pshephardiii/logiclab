import { signupRequestSchema, authMessageResponseSchema } from '@logiclab/contracts';
import { authErrorResponses } from '../../error-responses';
import type { RouteSchema } from '../../setup';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postSignupHandler } from './handler';

export const postSignupSchema = {
  summary: 'Create an account',
  description: 'Register a student or instructor and request email confirmation.',
  body: signupRequestSchema,
  response: { 202: authMessageResponseSchema, ...authErrorResponses },
} satisfies RouteSchema;

export async function postSignupRoute(app: FastifyInstance, context: AuthContext) {
  app.route({
    method: 'POST',
    url: '/api/auth/signup',
    schema: postSignupSchema,
    handler: postSignupHandler(context),
  });
}
