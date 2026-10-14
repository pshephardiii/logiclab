import {
  truthTableCheckRequestSchema,
  truthTableCheckResponseSchema,
  truthTableErrorResponseSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { FastifyInstance } from 'fastify';
import { postCheckHandler } from './handler';

export const postCheckSchema = {
  summary: 'Check truth-table answers',
  description: 'Public, stateless independent practice; assignment permissions are separate.',
  body: truthTableCheckRequestSchema,
  response: { 200: truthTableCheckResponseSchema, 400: truthTableErrorResponseSchema },
} satisfies RouteSchema;

export async function postCheckRoute(app: FastifyInstance) {
  app.post('/api/truth-tables/check', { schema: postCheckSchema }, postCheckHandler);
}
