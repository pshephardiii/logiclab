import type { FastifyInstance } from 'fastify';
import {
  problemParamsSchema,
  problemVersionListQuerySchema,
  problemVersionListResponseSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { getProblemVersionsHandler } from './handler';

export const getProblemVersionsSchema = {
  summary: 'List published problem versions',
  description:
    'Owner-only problem publication/history/archive operation; grants no classroom access.',
  params: problemParamsSchema,
  querystring: problemVersionListQuerySchema,
  response: { 200: problemVersionListResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function getProblemVersionsRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'GET',
    url: '/api/problems/:problemId/versions',
    schema: getProblemVersionsSchema,
    handler: getProblemVersionsHandler(context),
  });
}
