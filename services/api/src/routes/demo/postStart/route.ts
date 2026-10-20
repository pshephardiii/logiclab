import type { FastifyInstance } from 'fastify';
import { demoRoleRequestSchema, demoSessionResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoErrorResponses } from '../errors';
import { postStartHandler } from './handler';

export const postStartSchema = {
  summary: 'Start or resume an isolated demo',
  description: 'Synthetic workspace access only; normal account sessions are unaffected.',
  body: demoRoleRequestSchema,
  response: { 200: demoSessionResponseSchema, ...demoErrorResponses },
} satisfies RouteSchema;
export async function postStartRoute(app: FastifyInstance, runtime: DemoRuntime) {
  app.route({
    method: 'POST',
    url: '/api/demo/start',
    schema: postStartSchema,
    handler: postStartHandler(runtime),
  });
}
