import { buildApp } from '../../../app';
import {
  billingFixture,
  classId,
  planId,
  purchaseId,
  requestId,
} from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('registers postCheckout with scoped transport and no-store responses', async () => {
  const { context, billing } = billingFixture();
  const app = buildApp({ billing: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/classes/${classId}/checkout`,
      headers: { origin: context.config.APP_ORIGIN, cookie: `logiclab_session=${sessionId}` },
      payload: { planId, requestId },
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(billing.checkout).toHaveBeenCalledWith(expect.any(String), classId, {
      planId,
      requestId,
    });
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
      url: `/api/classes/${classId}/checkout`,
      headers: { origin: context.config.APP_ORIGIN },
      payload: { planId, requestId },
    });
    expect(guest.statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ id: 'student', subject: 'student', role: 'student' });
    const student = await app.inject({
      method: 'POST',
      url: `/api/classes/${classId}/checkout`,
      headers: { origin: context.config.APP_ORIGIN, cookie: `logiclab_session=${sessionId}` },
      payload: { planId, requestId },
    });
    expect(student.statusCode).toBe(403);
    const origin = await app.inject({
      method: 'POST',
      url: `/api/classes/${classId}/checkout`,
      headers: { cookie: `logiclab_session=${sessionId}`, origin: 'https://other.example' },
      payload: { planId, requestId },
    });
    expect(origin.statusCode).toBe(403);
    expect(billing.checkout).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
