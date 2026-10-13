import { truthTableRequestSchema, truthTableSolutionResponseSchema, truthTableErrorResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { FastifyInstance } from 'fastify';
import { postSolutionHandler } from './handler';

export const postSolutionSchema = {
  summary: 'Read a truth-table solution',
  description: 'Public, stateless independent practice; assignment permissions are separate.',
  body: truthTableRequestSchema,
  response: { 200: truthTableSolutionResponseSchema, 400: truthTableErrorResponseSchema },
} satisfies RouteSchema;

export async function postSolutionRoute(app: FastifyInstance) {
  app.post('/api/truth-tables/solution', { schema: postSolutionSchema }, postSolutionHandler);
}
