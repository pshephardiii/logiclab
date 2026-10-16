import type { FastifyRequest, FastifyReply } from 'fastify';
import type { BillingContext } from '../context';
import { BillingError } from '../../../application/billing/errors';
import { paymentReceiptResponseSchema } from '@logiclab/contracts';

export function postWebhookHandler(context: BillingContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-logiclab-signature'];
    if (typeof request.body !== 'string' || typeof signature !== 'string')
      throw new BillingError('invalid_signature');
    const result = await context.billing.webhook(request.body, signature);
    return reply.send(paymentReceiptResponseSchema.parse(result));
  };
}
