import type { FastifyInstance } from 'fastify';
import type { DemoRuntime } from '../../bootstrap/demo';
import { installAccountHttpPolicy } from '../account-http';
import { installDemoErrors } from './errors';
import { demoResourceRoutes } from './resources';
import { postStartRoute } from './postStart/route';
import { getSessionRoute } from './getSession/route';
import { postRoleRoute } from './postRole/route';
import { postResetRoute } from './postReset/route';
import { postLogoutRoute } from './postLogout/route';

export async function demoRoutes(app: FastifyInstance, runtime: DemoRuntime) {
  app.register(async (lifecycle) => {
    await installAccountHttpPolicy(lifecycle, runtime.config);
    installDemoErrors(lifecycle, runtime);
    lifecycle.register(postStartRoute, runtime);
    lifecycle.register(getSessionRoute, runtime);
    lifecycle.register(postRoleRoute, runtime);
    lifecycle.register(postResetRoute, runtime);
    lifecycle.register(postLogoutRoute, runtime);
  });
  app.register(demoResourceRoutes, { ...runtime, prefix: '/api/demo' });
}
