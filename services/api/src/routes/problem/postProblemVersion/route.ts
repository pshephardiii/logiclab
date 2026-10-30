import { libraryProblemVersionResponseSchema } from '@logiclab/contracts/problem-library';
import type { FastifyInstance } from 'fastify';
import { problemParamsSchema, emptyProblemRequestSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { postProblemVersionHandler } from './handler';

export const postProblemVersionSchema = {
  summary: 'Publish the current problem draft',
  description:
    'Owner-only problem publication/history/archive operation; grants no classroom access.',
  params: problemParamsSchema,
  body: emptyProblemRequestSchema,
  response: { 201: libraryProblemVersionResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function postProblemVersionRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'POST',
    url: '/api/problems/:problemId/versions',
    schema: postProblemVersionSchema,
    handler: postProblemVersionHandler(context),
  });
}
