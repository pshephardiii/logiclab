import type { FastifyInstance } from 'fastify';
import {
  problemParamsSchema,
  emptyProblemRequestSchema,
  problemResponseSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { postProblemArchiveHandler } from './handler';

export const postProblemArchiveSchema = {
  summary: 'Archive a problem',
  description:
    'Owner-only problem publication/history/archive operation; grants no classroom access.',
  params: problemParamsSchema,
  body: emptyProblemRequestSchema,
  response: { 200: problemResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function postProblemArchiveRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'POST',
    url: '/api/problems/:problemId/archive',
    schema: postProblemArchiveSchema,
    handler: postProblemArchiveHandler(context),
  });
}
