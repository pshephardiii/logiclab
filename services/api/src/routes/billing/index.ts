import { getPlansRoute } from './getPlans/route';
import { getClassBillingRoute } from './getClassBilling/route';
import type { FastifyInstance } from 'fastify';
import type { BillingContext } from './context';
import { installAccountHttpPolicy } from '../account-http';
import { installBillingErrors } from './errors';
import { billingInstructor } from './helpers';
import { postCheckoutRoute } from './postCheckout/route';
import { postSimulationRoute } from './postSimulation/route';
import { postWebhookRoute } from './postWebhook/route';

export async function billingRoutes(app: FastifyInstance, context: BillingContext) {
  installBillingErrors(app, context.config);
  app.register(billingAccountRoutes, context);
  app.register(postWebhookRoute, context);
}

export async function billingAccountRoutes(app: FastifyInstance, context: BillingContext) {
  installBillingErrors(app, context.config);
  app.decorateRequest('billingUser', null);
  await installAccountHttpPolicy(app, context.config);
  app.addHook('preValidation', async (request) => {
    await billingInstructor(request, context);
  });
  app.register(getPlansRoute, context);
  app.register(getClassBillingRoute, context);
  app.register(postCheckoutRoute, context);
  app.register(postSimulationRoute, context);
}
