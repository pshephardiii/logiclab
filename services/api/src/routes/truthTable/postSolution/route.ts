import type { FastifyInstance } from 'fastify';
import { postSolutionHandler } from './handler';

export async function postSolutionRoute(app: FastifyInstance) {
  app.post('/api/truth-tables/solution', postSolutionHandler);
}
