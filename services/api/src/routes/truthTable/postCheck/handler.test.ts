import { postCheckHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { truthTableCheckResponseSchema, truthTableErrorResponseSchema } from '@logiclab/contracts';

const invoke = (body: unknown) => invokeHandler(postCheckHandler, body);
const rowId = 'row:v1:P=T;Q=T';
const columnId = 'expr:v1:(P ∧ Q)';

test('check distinguishes correct, incorrect, explicit blank, and omitted answers', async () => {
  const response = await invoke({ formula: 'P & Q', answers: [
    { rowId, columnId, value: false },
    { rowId: 'row:v1:P=T;Q=F', columnId, value: false },
    { rowId: 'row:v1:P=F;Q=T', columnId, value: null },
  ] });
  expect(response.statusCode).toBe(200);
  const result = truthTableCheckResponseSchema.parse(response.body);
  expect(result.summary).toEqual({ correct: 1, incorrect: 1, unanswered: 2, total: 4 });
  expect(result.cells.map(cell => cell.status)).toEqual(['incorrect', 'correct', 'unanswered', 'unanswered']);
  expect(result.cells.every(cell => Object.keys(cell).sort().join(',') === 'columnId,rowId,status')).toBe(true);
});

test('empty answers report every answer cell as unanswered, including intermediate columns', async () => {
  const response = await invoke({ formula: '!(P & Q)', answers: [] });
  expect(response.statusCode).toBe(200);
  expect(truthTableCheckResponseSchema.parse(response.body).summary)
    .toEqual({ correct: 0, incorrect: 0, unanswered: 8, total: 8 });
});

test.each([
  { rowId: 'missing', columnId, value: true },
  { rowId, columnId: 'missing', value: true },
  { rowId, columnId: 'var:v1:P', value: false },
])('rejects unknown or given cells: %j', async answer => {
  const response = await invoke({ formula: 'P & Q', answers: [answer] });
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.body).error.code).toBe('INVALID_CELL');
});

test('rejects duplicate cells even when the first value is blank', async () => {
  const response = await invoke({ formula: 'P & Q', answers: [
    { rowId, columnId, value: null }, { rowId, columnId, value: true },
  ] });
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.body).error.code).toBe('DUPLICATE_CELL');
});

test.each([
  { formula: 'P & Q' },
  { formula: 'P & Q', answers: [{ rowId, columnId, value: 'F' }] },
  { formula: 'P & Q', answers: [{ rowId, columnId }] },
  { formula: 'P & Q', answers: [{ rowId, columnId, value: true, correct: true }] },
  { formula: 'P & Q', answers: Array.from({ length: 4097 }, () => ({ rowId, columnId, value: true })) },
])('rejects malformed check payloads', async payload => {
  const response = await invoke(payload);
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.body).error.code).toBe('INVALID_REQUEST');
});
