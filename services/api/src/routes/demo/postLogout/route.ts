import type { FastifyInstance } from 'fastify';
import { demoEmptyRequestSchema, demoMessageResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoErrorResponses } from '../errors';
import { postLogoutHandler } from './handler';

export const postLogoutSchema = {
  summary: 'End this demo session',
  description: 'Synthetic workspace access only; normal account sessions are unaffected.',
  body: demoEmptyRequestSchema,
  response: { 200: demoMessageResponseSchema, ...demoErrorResponses },
} satisfies RouteSchema;
export async function postLogoutRoute(app: FastifyInstance, runtime: DemoRuntime) {
  app.route({
    method: 'POST',
    url: '/api/demo/logout',
    schema: postLogoutSchema,
    handler: postLogoutHandler(runtime),
  });
}
