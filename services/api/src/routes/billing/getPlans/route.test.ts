import { buildApp } from '../../../app';
import { billingFixture, classId } from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('reads getPlans with authentication, bounded pagination and no-store', async () => {
  const { context, billing } = billingFixture();
  const app = buildApp({ billing: context });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/billing/plans',
      headers: { cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(billing.plans).toHaveBeenCalledWith({ offset: 0, limit: 20 });
    const invalid = await app.inject({
      method: 'GET',
      url: '/api/billing/plans' + '?limit=51',
      headers: { cookie: `logiclab_session=${sessionId}` },
    });
    expect(invalid.statusCode).toBe(400);
    const guest = await app.inject({ method: 'GET', url: '/api/billing/plans' });
    expect(guest.statusCode).toBe(401);
  } finally {
    await app.close();
  }
});
