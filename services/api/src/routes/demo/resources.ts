import type { FastifyInstance } from 'fastify';
import type { DemoRuntime } from '../../bootstrap/demo';
import { classroomRoutes } from '../classroom';
import { problemRoutes } from '../problem';
import { assignmentRoutes } from '../assignment';
import { studentWorkRoutes } from '../studentWork';
import { billingAccountRoutes } from '../billing';
import { AuthError } from '../../application/auth/service';
import { cookieName } from '../auth/cookies';

/** Reuse resource contracts/handlers; expose neither normal auth nor billing webhooks. */
export async function demoResourceRoutes(app: FastifyInstance, runtime: DemoRuntime) {
  app.addHook('onRoute', (route) => {
    route.url = route.url.replace('/api/demo/api/', '/api/demo/resources/');
    route.path = route.url;
    route.exposeHeadRoute = false;
    const original = route.handler;
    route.handler = async function (request, reply) {
      const id = request.cookies[cookieName(runtime.config)];
      if (!id) throw new AuthError('SESSION_INVALID');
      return runtime.run(id, request.method !== 'GET', async () =>
        original.call(this, request, reply),
      );
    };
  });
  app.register(classroomRoutes, runtime.context);
  app.register(problemRoutes, runtime.context);
  app.register(assignmentRoutes, runtime.context);
  app.register(studentWorkRoutes, runtime.context);
  app.register(billingAccountRoutes, runtime.context);
}
