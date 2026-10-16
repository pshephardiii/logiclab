import { buildApp } from '../../../app';
import {
  billingFixture,
  classId,
  planId,
  purchaseId,
  requestId,
} from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('registers postSimulation with scoped transport and no-store responses', async () => {
  const { context, billing } = billingFixture();
  const app = buildApp({ billing: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/billing/purchases/${purchaseId}/simulate`,
      headers: { origin: context.config.APP_ORIGIN, cookie: `logiclab_session=${sessionId}` },
      payload: { outcome: 'paid' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(billing.simulate).toHaveBeenCalledWith(expect.any(String), purchaseId, 'paid');
  } finally {
    await app.close();
  }
});

test('rejects guests, students, and wrong-origin mutations before delegation', async () => {
  const { context, billing, service } = billingFixture();
  const app = buildApp({ billing: context });
  try {
    const guest = await app.inject({
      method: 'POST',
      url: `/api/billing/purchases/${purchaseId}/simulate`,
      headers: { origin: context.config.APP_ORIGIN },
      payload: { outcome: 'paid' },
    });
    expect(guest.statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ id: 'student', subject: 'student', role: 'student' });
    const student = await app.inject({
      method: 'POST',
      url: `/api/billing/purchases/${purchaseId}/simulate`,
      headers: { origin: context.config.APP_ORIGIN, cookie: `logiclab_session=${sessionId}` },
      payload: { outcome: 'paid' },
    });
    expect(student.statusCode).toBe(403);
    const origin = await app.inject({
      method: 'POST',
      url: `/api/billing/purchases/${purchaseId}/simulate`,
      headers: { cookie: `logiclab_session=${sessionId}`, origin: 'https://other.example' },
      payload: { outcome: 'paid' },
    });
    expect(origin.statusCode).toBe(403);
    expect(billing.simulate).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
