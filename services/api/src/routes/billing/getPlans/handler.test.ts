import type { FastifyRequest, FastifyReply } from 'fastify';
import { getPlansHandler } from './handler';
import { billingFixture, classId } from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('normalizes query defaults for getPlans', async () => {
  const { context, billing } = billingFixture();
  const request = {
    cookies: { logiclab_session: sessionId },
    params: { classId },
    query: {},
  } as unknown as FastifyRequest;
  const reply = { send: jest.fn((value) => value) };
  await getPlansHandler(context)(request, reply as unknown as FastifyReply);
  expect(billing.plans).toHaveBeenCalledWith({ offset: 0, limit: 20 });
});
