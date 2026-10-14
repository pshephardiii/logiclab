import { classroomRoutes } from './routes/classroom';
import type { ClassroomContext } from './routes/classroom/context';
import Fastify from 'fastify';
import { healthRoute } from './routes/health/route';
import { truthTableRoutes } from './routes/truthTable';
import { authRoutes } from './routes/auth';
import type { AuthContext } from './routes/auth/context';

/**
 * Composes HTTP route groups from supplied dependencies without opening external resources.
 */
export function buildApp(options: { logger?: boolean; auth?: AuthContext; classroom?: ClassroomContext } = {}) {
  const app = Fastify({ logger: options.logger ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body', 'res.headers["set-cookie"]'] } : false });
  if (options.auth) app.register(authRoutes, options.auth);
  if (options.classroom) app.register(classroomRoutes, options.classroom);
  app.register(truthTableRoutes);
  app.register(healthRoute);
  return app;
}
