import type { FastifyInstance } from 'fastify';
import {
  billingListQuerySchema,
  classBillingResponseSchema,
  billingClassParamsSchema,
} from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingErrorResponses } from '../../error-responses';
import { getClassBillingHandler } from './handler';

export async function getClassBillingRoute(app: FastifyInstance, context: BillingContext) {
  app.route({
    method: 'GET',
    url: '/api/classes/:classId/billing',
    schema: {
      summary: 'Read simulated billing information',
      description: 'Instructor-only catalog or owned class billing status.',
      params: billingClassParamsSchema,
      querystring: billingListQuerySchema,
      response: { 200: classBillingResponseSchema, ...billingErrorResponses },
    },
    handler: getClassBillingHandler(context),
  });
}
