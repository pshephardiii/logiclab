import Fastify from 'fastify';
import { healthResponseSchema } from '@logiclab/schema';

export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  app.get('/api/health', async () =>
    healthResponseSchema.parse({ status: 'ok', service: 'logiclab-api' }),
  );
  return app;
}
