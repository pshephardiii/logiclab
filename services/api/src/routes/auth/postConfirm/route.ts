import { confirmationRequestSchema, authMessageResponseSchema } from '@logiclab/contracts';
import { authErrorResponses, type AuthRouteSchema } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postConfirmHandler } from './handler';

export const postConfirmSchema = {
  summary: 'Confirm an email address',
  description: 'Confirm the signup email using its six-digit code; sign in separately.',
  body: confirmationRequestSchema,
  response: { 200: authMessageResponseSchema, ...authErrorResponses },
} satisfies AuthRouteSchema;

export async function postConfirmRoute(app: FastifyInstance, context: AuthContext) {
  app.route({ method: 'POST', url: '/api/auth/confirm', schema: postConfirmSchema, handler: postConfirmHandler(context) });
}
