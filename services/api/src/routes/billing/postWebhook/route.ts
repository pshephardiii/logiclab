import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { paymentReceiptResponseSchema } from '@logiclab/contracts';
import { installZodSchemas } from '../../setup';
import { billingErrorResponses } from '../../error-responses';
import type { BillingContext } from '../context';
import { postWebhookHandler } from './handler';

/** Isolated raw JSON parser: verify wire bytes before parsing, without cookie/origin authentication. */
export async function postWebhookRoute(app: FastifyInstance, context: BillingContext) {
  installZodSchemas(app);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string', bodyLimit: 16_384 },
    (_request, body, done) => done(null, body),
  );
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });
  app.route({
    method: 'POST',
    url: '/api/billing/webhook',
    bodyLimit: 16_384,
    schema: {
      summary: 'Receive a signed simulated payment event',
      description: 'Only verified events reach transactional processing.',
      response: { 200: paymentReceiptResponseSchema, ...billingErrorResponses },
    },
    handler: postWebhookHandler(context),
  });
}
