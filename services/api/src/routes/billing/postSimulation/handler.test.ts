import type { FastifyRequest, FastifyReply } from 'fastify';
import { postSimulationHandler } from './handler';
import {
  billingFixture,
  classId,
  planId,
  purchaseId,
  requestId,
} from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('delegates postSimulation using authenticated identity or signed raw bytes', async () => {
  const { context, billing } = billingFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { purchaseId },
    body: { outcome: 'paid' },
    headers: { 'x-logiclab-signature': 'synthetic-signature' },
  } as unknown as FastifyRequest;
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((value) => value),
  };
  await postSimulationHandler(context)(request, reply as unknown as FastifyReply);
  expect(billing.simulate).toHaveBeenCalledWith(expect.any(String), purchaseId, 'paid');
});
