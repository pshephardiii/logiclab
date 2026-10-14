import { buildApp } from '../../../app';
import {
  truthTableErrorResponseSchema,
  truthTableExerciseResponseSchema,
  truthTableSolutionResponseSchema,
  truthTableCheckResponseSchema,
} from '@logiclab/contracts';

const app = buildApp();
afterAll(async () => {
  await app.close();
});
const post = (route: string, payload: unknown) =>
  app.inject({
    method: 'POST',
    url: `/api/truth-tables/${route}`,
    payload: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });

test('registers POST /api/truth-tables/exercise', async () => {
  const response = await post('exercise', { formula: 'P & Q' });
  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toContain('application/json');
});

test('returns HTTP 400 for invalid request data', async () => {
  const response = await post('exercise', { formula: 1 });
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.json()).error.code).toBe('INVALID_REQUEST');
});

test('exercise, solution and checking agree on IDs across equivalent notation', async () => {
  const exercise = truthTableExerciseResponseSchema.parse(
    (await post('exercise', { formula: '!(P & Q)' })).json(),
  );
  const solution = truthTableSolutionResponseSchema.parse(
    (await post('solution', { formula: '¬(P ∧ Q)' })).json(),
  );
  expect(exercise.columns).toEqual(solution.columns);
  expect(exercise.rows.map((row) => row.id)).toEqual(solution.rows.map((row) => row.id));
  const answers = solution.rows.flatMap((row) =>
    solution.columns
      .filter((column) => column.kind === 'answer')
      .map((column) => ({ rowId: row.id, columnId: column.id, value: row.values[column.id] })),
  );
  const result = truthTableCheckResponseSchema.parse(
    (await post('check', { formula: '((¬(P ∧ Q)))', answers })).json(),
  );
  expect(result.summary).toEqual({ correct: 8, incorrect: 0, unanswered: 0, total: 8 });
});

test('parser variable limits apply to the API', async () => {
  const response = await post('exercise', { formula: 'A & B & C & D & E' });
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe('VARIABLE_LIMIT');
});

test('malformed JSON returns a structured error', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/truth-tables/exercise',
    payload: '{',
    headers: { 'content-type': 'application/json' },
  });
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.json()).error.code).toBe('INVALID_REQUEST');
});

test('rejects malformed formulas with position information', async () => {
  const response = await post('exercise', { formula: 'P &' });
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.json()).error).toMatchObject({
    code: 'EXPECTED_EXPRESSION',
    position: 3,
  });
});
