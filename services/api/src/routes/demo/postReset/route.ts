import type { FastifyInstance } from 'fastify';
import { demoEmptyRequestSchema, demoSessionResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoErrorResponses } from '../errors';
import { postResetHandler } from './handler';

export const postResetSchema = {
  summary: 'Reset this demo workspace',
  description: 'Synthetic workspace access only; normal account sessions are unaffected.',
  body: demoEmptyRequestSchema,
  response: { 200: demoSessionResponseSchema, ...demoErrorResponses },
} satisfies RouteSchema;
export async function postResetRoute(app: FastifyInstance, runtime: DemoRuntime) {
  app.route({
    method: 'POST',
    url: '/api/demo/reset',
    schema: postResetSchema,
    handler: postResetHandler(runtime),
  });
}
