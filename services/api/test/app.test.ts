import { buildApp } from '../src/app';

const app = buildApp();
afterAll(async () => { await app.close(); });

test('unknown routes return 404', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/missing' });
  expect(response.statusCode).toBe(404);
});
