import type { FastifyInstance } from 'fastify';
import { postCheckHandler } from './handler';

export async function postCheckRoute(app: FastifyInstance) {
  app.post('/api/truth-tables/check', postCheckHandler);
}
