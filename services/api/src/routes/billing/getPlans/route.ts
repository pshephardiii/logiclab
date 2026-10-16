import type { FastifyInstance } from 'fastify';
import { billingListQuerySchema, billingPlansResponseSchema } from '@logiclab/contracts';
import type { BillingContext } from '../context';
import { billingErrorResponses } from '../../error-responses';
import { getPlansHandler } from './handler';

export async function getPlansRoute(app: FastifyInstance, context: BillingContext) {
  app.route({
    method: 'GET',
    url: '/api/billing/plans',
    schema: {
      summary: 'Read simulated billing information',
      description: 'Instructor-only catalog or owned class billing status.',
      querystring: billingListQuerySchema,
      response: { 200: billingPlansResponseSchema, ...billingErrorResponses },
    },
    handler: getPlansHandler(context),
  });
}
