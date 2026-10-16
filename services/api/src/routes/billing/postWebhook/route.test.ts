import { buildApp } from '../../../app';
import {
  billingFixture,
  classId,
  planId,
  purchaseId,
  requestId,
} from '../../../../test/billing-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('registers postWebhook with scoped transport and no-store responses', async () => {
  const { context, billing } = billingFixture();
  const app = buildApp({ billing: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: {
        'content-type': 'application/json',
        'x-logiclab-signature': 'synthetic-signature',
      },
      payload: '{}',
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(billing.webhook).toHaveBeenCalledWith('{}', 'synthetic-signature');
  } finally {
    await app.close();
  }
});

test('rejects missing signatures and oversized bodies without invoking processing', async () => {
  const { context, billing } = billingFixture();
  const app = buildApp({ billing: context });
  try {
    const missing = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(missing.statusCode).toBe(400);
    const oversized = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: { 'content-type': 'application/json', 'x-logiclab-signature': 'synthetic' },
      payload: 'x'.repeat(17000),
    });
    expect(oversized.statusCode).toBe(413);
    expect(billing.webhook).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
