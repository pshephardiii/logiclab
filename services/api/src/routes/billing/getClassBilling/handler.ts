import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  billingListQuerySchema,
  classBillingResponseSchema,
  billingClassParamsSchema,
} from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingInstructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getClassBillingHandler(context: BillingContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await billingInstructor(request, context);
    const { classId } = parseRequest(billingClassParamsSchema, request.params);
    const query = parseRequest(billingListQuerySchema, request.query);
    return classBillingResponseSchema.parse(
      await context.billing.readClass(user.id, classId, query),
    );
  };
}
