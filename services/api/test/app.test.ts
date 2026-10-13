import { buildApp } from '../src/app';
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

test('unknown routes return 404', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/missing' });
  expect(response.statusCode).toBe(404);
});
