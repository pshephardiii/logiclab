import Fastify from 'fastify';
import { healthResponseSchema } from '@logiclab/schema';
import { truthTableRoutes } from './routes/truthTable';

export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  app.register(truthTableRoutes);
  app.get('/api/health', async () =>
    healthResponseSchema.parse({ status: 'ok', service: 'logiclab-api' }),
  );
  return app;
}
