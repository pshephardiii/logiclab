import { buildApp } from '../../app';
import { healthResponseSchema } from '@logiclab/contracts';
const app = buildApp();
afterAll(async () => { await app.close(); });

test('health endpoint returns the shared contract', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/health' });
  expect(response.statusCode).toBe(200);
  expect(healthResponseSchema.parse(response.json())).toEqual({
    status: 'ok', service: 'logiclab-api',
  });
});

