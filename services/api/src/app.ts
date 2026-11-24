import { demoRoutes } from './routes/demo';
import type { DemoRuntime } from './bootstrap/demo';
import { billingRoutes } from './routes/billing';
import type { BillingContext } from './routes/billing/context';
import { studentWorkRoutes } from './routes/studentWork';
import type { StudentWorkContext } from './routes/studentWork/context';
import { assignmentRoutes } from './routes/assignment';
import type { AssignmentContext } from './routes/assignment/context';
import { problemRoutes } from './routes/problem';
import type { ProblemContext } from './routes/problem/context';
import { classroomRoutes } from './routes/classroom';
import type { ClassroomContext } from './routes/classroom/context';
import Fastify from 'fastify';
import { healthRoute } from './routes/health/route';
import { truthTableRoutes } from './routes/truthTable';
import { authRoutes } from './routes/auth';
import type { AuthContext } from './routes/auth/context';
import { ProductExposure, resolveProductExposure } from '@logiclab/contracts/product-exposure';
import { productExposureRoute } from './routes/productExposure/route';

/**
 * Composes HTTP route groups from supplied dependencies without opening external resources.
 */
export function buildApp(
  options: {
    logger?: boolean;
    productExposure?: ProductExposure;
    demo?: DemoRuntime;
    auth?: AuthContext;
    classroom?: ClassroomContext;
    problem?: ProblemContext;
    assignment?: AssignmentContext;
    studentWork?: StudentWorkContext;
    billing?: BillingContext;
  } = {},
) {
  const productExposure = resolveProductExposure(options.productExposure, {
    production: false,
    settingName: 'productExposure',
  });
  const app = Fastify({
    logger: options.logger
      ? {
          redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.headers["x-logiclab-signature"]',
            'req.body',
            'res.headers["set-cookie"]',
          ],
        }
      : false,
  });

  // Resource routes belong only to full mode, even if a caller supplies their dependencies.
  if (productExposure === ProductExposure.Full) {
    if (options.demo) app.register(demoRoutes, options.demo);

    if (options.billing) app.register(billingRoutes, options.billing);

    if (options.auth) app.register(authRoutes, options.auth);

    if (options.classroom) app.register(classroomRoutes, options.classroom);

    if (options.studentWork) app.register(studentWorkRoutes, options.studentWork);

    if (options.assignment) app.register(assignmentRoutes, options.assignment);

    if (options.problem) app.register(problemRoutes, options.problem);
  }

  app.register(truthTableRoutes);
  app.register(healthRoute);
  app.register(productExposureRoute, { productExposure });
  return app;
}
