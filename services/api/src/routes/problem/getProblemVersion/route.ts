import type { FastifyInstance } from 'fastify';
import { problemVersionParamsSchema, problemVersionResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { getProblemVersionHandler } from './handler';

export const getProblemVersionSchema = {
  summary: 'Read a published problem version',
  description:
    'Owner-only problem publication/history/archive operation; grants no classroom access.',
  params: problemVersionParamsSchema,
  response: { 200: problemVersionResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function getProblemVersionRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'GET',
    url: '/api/problems/:problemId/versions/:version',
    schema: getProblemVersionSchema,
    handler: getProblemVersionHandler(context),
  });
}
