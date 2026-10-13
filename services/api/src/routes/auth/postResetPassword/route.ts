import { resetPasswordRequestSchema, authMessageResponseSchema } from '@logiclab/contracts';
import { authErrorResponses, type AuthRouteSchema } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postResetPasswordHandler } from './handler';

export const postResetPasswordSchema = {
  summary: 'Reset a password',
  description: 'Consume a reset code, change the password, and invalidate local sessions.',
  body: resetPasswordRequestSchema,
  response: { 200: authMessageResponseSchema, ...authErrorResponses },
} satisfies AuthRouteSchema;

export async function postResetPasswordRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/reset-password', schema: postResetPasswordSchema, handler: postResetPasswordHandler(context) });
}
