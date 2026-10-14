import {
  truthTableRequestSchema,
  truthTableExerciseResponseSchema,
  truthTableErrorResponseSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { FastifyInstance } from 'fastify';
import { postExerciseHandler } from './handler';

export const postExerciseSchema = {
  summary: 'Create a truth-table exercise',
  description: 'Public, stateless independent practice; assignment permissions are separate.',
  body: truthTableRequestSchema,
  response: { 200: truthTableExerciseResponseSchema, 400: truthTableErrorResponseSchema },
} satisfies RouteSchema;

export async function postExerciseRoute(app: FastifyInstance) {
  app.post('/api/truth-tables/exercise', { schema: postExerciseSchema }, postExerciseHandler);
}
