import type { FastifyInstance } from 'fastify';
import { demoRoleRequestSchema, demoSessionResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoErrorResponses } from '../errors';
import { postRoleHandler } from './handler';

export const postRoleSchema = {
  summary: 'Switch demo role',
  description: 'Synthetic workspace access only; normal account sessions are unaffected.',
  body: demoRoleRequestSchema,
  response: { 200: demoSessionResponseSchema, ...demoErrorResponses },
} satisfies RouteSchema;
export async function postRoleRoute(app: FastifyInstance, runtime: DemoRuntime) {
  app.route({
    method: 'POST',
    url: '/api/demo/role',
    schema: postRoleSchema,
    handler: postRoleHandler(runtime),
  });
}
