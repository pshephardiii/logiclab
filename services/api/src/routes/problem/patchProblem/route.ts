import {
  updateLibraryProblemRequestSchema,
  libraryProblemResponseSchema,
} from '@logiclab/contracts/problem-library';
import { problemParamsSchema } from '@logiclab/contracts';
import type { FastifyInstance } from 'fastify';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { patchProblemHandler } from './handler';

export const patchProblemSchema = {
  summary: 'Edit an active problem draft',
  description:
    'Instructor-only private library operation; publishing and classroom access are separate.',
  params: problemParamsSchema,
  body: updateLibraryProblemRequestSchema,
  response: { 200: libraryProblemResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function patchProblemRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'PATCH',
    url: '/api/problems/:problemId',
    schema: patchProblemSchema,
    handler: patchProblemHandler(context),
  });
}
