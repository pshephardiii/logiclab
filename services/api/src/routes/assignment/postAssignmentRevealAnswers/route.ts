import type { FastifyInstance } from 'fastify';
import {
  assignmentParamsSchema,
  assignmentResponseSchema,
  assignmentActionRequestSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { AssignmentContext } from '../context';
import { assignmentErrorResponses } from '../../error-responses';
import { postAssignmentRevealAnswersHandler } from './handler';

export const postAssignmentRevealAnswersSchema = {
  summary: 'Reveal assignment answers',
  description:
    'Owner-authorized independent release; repeated requests retain the original release metadata.',
  params: assignmentParamsSchema,
  body: assignmentActionRequestSchema,
  response: { 200: assignmentResponseSchema, ...assignmentErrorResponses },
} satisfies RouteSchema;

export async function postAssignmentRevealAnswersRoute(
  app: FastifyInstance,
  context: AssignmentContext,
) {
  app.route({
    method: 'POST',
    url: '/api/assignments/:assignmentId/reveal-answers',
    schema: postAssignmentRevealAnswersSchema,
    handler: postAssignmentRevealAnswersHandler(context),
  });
}
