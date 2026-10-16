import type { FastifyInstance } from 'fastify';
import {
  billingPurchaseParamsSchema,
  simulatorRequestSchema,
  paymentReceiptResponseSchema,
} from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingErrorResponses } from '../../error-responses';
import { postSimulationHandler } from './handler';

export async function postSimulationRoute(app: FastifyInstance, context: BillingContext) {
  app.route({
    method: 'POST',
    url: '/api/billing/purchases/:purchaseId/simulate',
    schema: {
      summary: 'Simulated billing simulation',
      description: 'Instructor-owned class billing; no real charges.',
      params: billingPurchaseParamsSchema,
      body: simulatorRequestSchema,
      response: { 200: paymentReceiptResponseSchema, ...billingErrorResponses },
    },
    handler: postSimulationHandler(context),
  });
}
