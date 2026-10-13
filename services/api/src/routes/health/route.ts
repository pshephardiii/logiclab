import { healthHandler } from './handler';
import type { FastifyInstance } from 'fastify';
import { healthResponseSchema } from '@logiclab/contracts';
import { installZodSchemas, type RouteSchema } from '../setup';
export const healthSchema = {
  summary: 'Check API health',
  description: 'Report API process availability; this does not check external dependencies.',
  response: { 200: healthResponseSchema },
} satisfies RouteSchema;
export async function healthRoute(app: FastifyInstance) {
  installZodSchemas(app);
  app.get('/api/health', { schema: healthSchema }, healthHandler);
}
