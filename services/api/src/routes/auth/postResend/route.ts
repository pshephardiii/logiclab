import { emailRequestSchema, authMessageResponseSchema } from '@logiclab/contracts';
import { authErrorResponses } from '../../error-responses';
import type { RouteSchema } from '../../setup';
import type { FastifyInstance } from 'fastify';
import type { AuthContext } from '../context';
import { postResendHandler } from './handler';

export const postResendSchema = {
  summary: 'Resend email confirmation',
  description: 'Return account-neutral instructions for requesting another confirmation code.',
  body: emailRequestSchema,
  response: { 202: authMessageResponseSchema, ...authErrorResponses },
} satisfies RouteSchema;

export async function postResendRoute(app: FastifyInstance, context: AuthContext) {
  app.route({
    method: 'POST',
    url: '/api/auth/resend',
    schema: postResendSchema,
    handler: postResendHandler(context),
  });
}
