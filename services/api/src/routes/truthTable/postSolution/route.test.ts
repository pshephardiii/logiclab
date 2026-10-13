import { buildApp } from '../../../app';
import { truthTableErrorResponseSchema } from '@logiclab/contracts';

const app = buildApp();
afterAll(async () => { await app.close(); });
const post = (route: string, payload: unknown) => app.inject({
  method: 'POST', url: `/api/truth-tables/${route}`, payload: JSON.stringify(payload),
  headers: { 'content-type': 'application/json' },
});

test('registers POST /api/truth-tables/solution', async () => {
  const response = await post('solution', { formula: 'P & Q' });
  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toContain('application/json');
});

test('returns HTTP 400 for invalid request data', async () => {
  const response = await post('solution', { formula: 1 });
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.json()).error.code).toBe('INVALID_REQUEST');
});

test('rejects malformed formulas with position information', async () => {
  const response = await post('solution', { formula: 'P &' });
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.json()).error)
    .toMatchObject({ code: 'EXPECTED_EXPRESSION', position: 3 });
});
