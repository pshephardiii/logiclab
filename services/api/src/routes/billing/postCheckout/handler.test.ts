import type { FastifyRequest, FastifyReply } from 'fastify';
import { postCheckoutHandler } from './handler';
import {
  billingFixture,
  classId,
  planId,
  purchaseId,
  requestId,
} from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates postCheckout using authenticated identity or signed raw bytes', async () => {
  const { context, billing } = billingFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { classId },
    body: { planId, requestId },
    headers: { 'x-logiclab-signature': 'synthetic-signature' },
  } as unknown as FastifyRequest;
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((value) => value),
  };
  await postCheckoutHandler(context)(request, reply as unknown as FastifyReply);
  expect(billing.checkout).toHaveBeenCalledWith(expect.any(String), classId, { planId, requestId });
});
