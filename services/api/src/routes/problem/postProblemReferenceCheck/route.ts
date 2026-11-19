import type { FastifyInstance } from 'fastify';
import { emptyProblemRequestSchema, problemParamsSchema } from '@logiclab/contracts';
import { libraryReferenceCheckResponseSchema } from '@logiclab/contracts/problem-library';
import type { RouteSchema } from '../../setup';
import type { ProblemContext } from '../context';
import { problemErrorResponses } from '../../error-responses';
import { postProblemReferenceCheckHandler } from './handler';

export const postProblemReferenceCheckSchema = {
  summary: 'Check the saved private proof or truth-tree reference',
  description:
    'Owner-only check, including archived drafts. Does not save or publish; accepts no client replacement proof.',
  params: problemParamsSchema,
  body: emptyProblemRequestSchema,
  response: { 200: libraryReferenceCheckResponseSchema, ...problemErrorResponses },
} satisfies RouteSchema;

export async function postProblemReferenceCheckRoute(
  app: FastifyInstance,
  context: ProblemContext,
) {
  app.route({
    method: 'POST',
    url: '/api/problems/:problemId/reference-check',
    schema: postProblemReferenceCheckSchema,
    handler: postProblemReferenceCheckHandler(context),
  });
}
