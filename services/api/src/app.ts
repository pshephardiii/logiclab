import { classroomRoutes } from './routes/classroom';
import type { ClassroomStore } from './classroom/store';
import Fastify from 'fastify';
import { healthResponseSchema } from '@logiclab/contracts';
import { truthTableRoutes } from './routes/truthTable';
import { authRoutes } from './routes/auth';
import type { AuthContext } from './routes/auth/context';

export function buildApp(options: { logger?: boolean; auth?: AuthContext & { classrooms?: ClassroomStore } } = {}) {
  const app = Fastify({ logger: options.logger ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body', 'res.headers["set-cookie"]'] } : false });
  if (options.auth) {
    app.register(authRoutes, options.auth);
    if (options.auth.classrooms) app.register(classroomRoutes, { ...options.auth, classrooms: options.auth.classrooms });
  }
  app.register(truthTableRoutes);
  app.get('/api/health', async () =>
    healthResponseSchema.parse({ status: 'ok', service: 'logiclab-api' }),
  );
  return app;
}
