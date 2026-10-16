import type { FastifyInstance } from 'fastify';
import {
  problemParamsSchema,
  emptyProblemRequestSchema,
  problemResponseSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { postProblemRestoreHandler } from './handler';

export const postProblemRestoreSchema = {
  summary: 'Restore an archived problem',
  description:
    'Owner-only problem publication/history/archive operation; grants no classroom access.',
  params: problemParamsSchema,
  body: emptyProblemRequestSchema,
  response: { 200: problemResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function postProblemRestoreRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'POST',
    url: '/api/problems/:problemId/restore',
    schema: postProblemRestoreSchema,
    handler: postProblemRestoreHandler(context),
  });
}
