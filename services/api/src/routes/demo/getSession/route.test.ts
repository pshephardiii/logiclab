import { buildApp } from '../../../app';
import { demoFixture, demoId } from '../../../../test/demo-fixture';

test('getSession uses demo HTTP contracts, no-store responses, and exact mutation origins', async () => {
  const { runtime, config } = demoFixture();
  const app = buildApp({ demo: runtime });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/demo/session',
      headers: { origin: config.APP_ORIGIN, cookie: `logiclab_demo=${demoId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});
