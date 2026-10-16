import type { FastifyRequest, FastifyReply } from 'fastify';
import { billingListQuerySchema, billingPlansResponseSchema } from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingInstructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getPlansHandler(context: BillingContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await billingInstructor(request, context);

    const query = parseRequest(billingListQuerySchema, request.query);
    return reply.send(billingPlansResponseSchema.parse(await context.billing.plans(query)));
  };
}
