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
  app.register(async (account) => {
    account.decorateRequest('billingUser', null);
    await installAccountHttpPolicy(account, context.config);
    account.addHook('preValidation', async (request) => {
      await billingInstructor(request, context);
    });
    account.register(getPlansRoute, context);
    account.register(getClassBillingRoute, context);
    account.register(postCheckoutRoute, context);
    account.register(postSimulationRoute, context);
  });
  app.register(postWebhookRoute, context);
}
