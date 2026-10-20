import { buildApp } from '../../../app';
import { demoFixture, demoId } from '../../../../test/demo-fixture';

test('postRole uses demo HTTP contracts, no-store responses, and exact mutation origins', async () => {
  const { runtime, config } = demoFixture();
  const app = buildApp({ demo: runtime });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/role',
      headers: { origin: config.APP_ORIGIN, cookie: `logiclab_demo=${demoId}` },
      payload: { role: 'student' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/demo/role',
      headers: { origin: 'https://other.invalid', cookie: `logiclab_demo=${demoId}` },
      payload: { role: 'student' },
    });
    expect(rejected.statusCode).toBe(403);
  } finally {
    await app.close();
  }
});
