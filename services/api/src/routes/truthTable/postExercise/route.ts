import type { FastifyInstance } from 'fastify';
import { postExerciseHandler } from './handler';

export async function postExerciseRoute(app: FastifyInstance) {
  app.post('/api/truth-tables/exercise', postExerciseHandler);
}
