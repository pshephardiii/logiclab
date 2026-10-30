import {
  createLibraryProblemRequestSchema,
  libraryProblemResponseSchema,
} from '@logiclab/contracts/problem-library';
import type { FastifyInstance } from 'fastify';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { postProblemHandler } from './handler';

export const postProblemSchema = {
  summary: 'Create a private problem draft',
  description:
    'Instructor-only private library operation; publishing and classroom access are separate.',
  body: createLibraryProblemRequestSchema,
  response: { 201: libraryProblemResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function postProblemRoute(app: FastifyInstance, context: ProblemContext) {
  app.route({
    method: 'POST',
    url: '/api/problems',
    schema: postProblemSchema,
    handler: postProblemHandler(context),
  });
}
