import type { FastifyInstance } from 'fastify';
import { demoEmptyRequestSchema, demoSessionResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoErrorResponses } from '../errors';
import { getSessionHandler } from './handler';

export const getSessionSchema = {
  summary: 'Restore a demo session',
  description: 'Synthetic workspace access only; normal account sessions are unaffected.',
  response: { 200: demoSessionResponseSchema, ...demoErrorResponses },
} satisfies RouteSchema;
export async function getSessionRoute(app: FastifyInstance, runtime: DemoRuntime) {
  app.route({
    method: 'GET',
    url: '/api/demo/session',
    schema: getSessionSchema,
    handler: getSessionHandler(runtime),
  });
}
