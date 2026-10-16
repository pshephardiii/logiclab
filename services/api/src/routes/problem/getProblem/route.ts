import { problemParamsSchema, problemResponseSchema } from '@logiclab/contracts';
import type { FastifyInstance } from 'fastify';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { getProblemHandler } from './handler';

export const getProblemSchema = {
  summary: 'View an owned problem draft',
  description:
    'Instructor-only private library operation; publishing and classroom access are separate.',
  params: problemParamsSchema,
  response: { 200: problemResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function getProblemRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'GET',
    url: '/api/problems/:problemId',
    schema: getProblemSchema,
    handler: getProblemHandler(context),
  });
}
