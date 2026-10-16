import type { FastifyInstance } from 'fastify';
import {
  billingClassParamsSchema,
  checkoutRequestSchema,
  purchaseResponseSchema,
} from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingErrorResponses } from '../../error-responses';
import { postCheckoutHandler } from './handler';

export async function postCheckoutRoute(app: FastifyInstance, context: BillingContext) {
  app.route({
    method: 'POST',
    url: '/api/classes/:classId/checkout',
    schema: {
      summary: 'Simulated billing checkout',
      description: 'Instructor-owned class billing; no real charges.',
      params: billingClassParamsSchema,
      body: checkoutRequestSchema,
      response: { 201: purchaseResponseSchema, ...billingErrorResponses },
    },
    handler: postCheckoutHandler(context),
  });
}
