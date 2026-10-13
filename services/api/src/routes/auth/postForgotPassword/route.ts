import { emailRequestSchema, authMessageResponseSchema } from '@logiclab/contracts';
import { authErrorResponses, type AuthRouteSchema } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postForgotPasswordHandler } from './handler';

export const postForgotPasswordSchema = {
  summary: 'Request password recovery',
  description: 'Return account-neutral instructions for requesting a password-reset code.',
  body: emailRequestSchema,
  response: { 202: authMessageResponseSchema, ...authErrorResponses },
} satisfies AuthRouteSchema;

export async function postForgotPasswordRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/forgot-password', schema: postForgotPasswordSchema, handler: postForgotPasswordHandler(context) });
}
