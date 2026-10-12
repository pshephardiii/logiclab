import Fastify from 'fastify';
import { healthResponseSchema } from '@logiclab/schema';
import { truthTableRoutes } from './routes/truthTable';
import { authRoutes } from './routes/auth';
import type { AuthContext } from './routes/auth/context';

export function buildApp(options: { logger?: boolean; auth?: AuthContext } = {}) {
  const app = Fastify({ logger: options.logger ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body', 'res.headers["set-cookie"]'] } : false });
  if (options.auth) app.register(authRoutes, options.auth);
  app.register(truthTableRoutes);
  app.get('/api/health', async () =>
    healthResponseSchema.parse({ status: 'ok', service: 'logiclab-api' }),
  );
  return app;
}
