import type { FastifyRequest, FastifyReply } from 'fastify';
import { getClassBillingHandler } from './handler';
import { billingFixture, classId } from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('normalizes query defaults for getClassBilling', async () => {
  const { context, billing } = billingFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { classId },
    query: {},
  } as unknown as FastifyRequest;
  const reply = { send: jest.fn((value) => value) };
  await getClassBillingHandler(context)(request, reply as unknown as FastifyReply);
  expect(billing.readClass).toHaveBeenCalledWith(expect.any(String), classId, {
    offset: 0,
    limit: 20,
  });
});
