import { libraryProblemListResponseSchema } from '@logiclab/contracts/problem-library';
import { problemListQuerySchema } from '@logiclab/contracts';
import type { FastifyInstance } from 'fastify';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { getProblemsHandler } from './handler';

export const getProblemsSchema = {
  summary: 'List active problem drafts',
  description:
    'Instructor-only private library operation; publishing and classroom access are separate.',
  querystring: problemListQuerySchema,
  response: { 200: libraryProblemListResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function getProblemsRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'GET',
    url: '/api/problems',
    schema: getProblemsSchema,
    handler: getProblemsHandler(context),
  });
}
