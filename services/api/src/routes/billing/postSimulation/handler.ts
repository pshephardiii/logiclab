import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  billingPurchaseParamsSchema,
  simulatorRequestSchema,
  paymentReceiptResponseSchema,
} from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingInstructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postSimulationHandler(context: BillingContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await billingInstructor(request, context);
    const { purchaseId } = parseRequest(billingPurchaseParamsSchema, request.params);
    const input = parseRequest(simulatorRequestSchema, request.body);
    const result = await context.billing.simulate(user.id, purchaseId, input.outcome);
    reply.code(200);
    return paymentReceiptResponseSchema.parse(result);
  };
}
