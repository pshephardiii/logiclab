import {
  problemParamsSchema,
  updateProblemRequestSchema,
  problemResponseSchema,
} from '@logiclab/contracts';
import type { FastifyInstance } from 'fastify';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../schemas';
import { patchProblemHandler } from './handler';

export const patchProblemSchema = {
  summary: 'Edit an active problem draft',
  description:
    'Instructor-only private library operation; publishing and classroom access are separate.',
  params: problemParamsSchema,
  body: updateProblemRequestSchema,
  response: { 200: problemResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function patchProblemRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'PATCH',
    url: '/api/problems/:problemId',
    schema: patchProblemSchema,
    handler: patchProblemHandler(context),
  });
}
