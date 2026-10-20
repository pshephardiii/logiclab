import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  billingClassParamsSchema,
  checkoutRequestSchema,
  purchaseResponseSchema,
} from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingInstructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postCheckoutHandler(context: BillingContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await billingInstructor(request, context);
    const { classId } = parseRequest(billingClassParamsSchema, request.params);
    const input = parseRequest(checkoutRequestSchema, request.body);
    const result = await context.billing.checkout(user.id, classId, input);
    reply.code(201);
    return purchaseResponseSchema.parse(result);
  };
}
