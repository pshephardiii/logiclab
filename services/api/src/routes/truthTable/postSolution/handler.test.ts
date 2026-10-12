import { postSolutionHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { truthTableSolutionResponseSchema, truthTableErrorResponseSchema } from '@logiclab/schema';

const invoke = (body: unknown) => invokeHandler(postSolutionHandler, body);
const columnId = 'expr:v1:(P ∧ Q)';

test('solution returns expected answers for independent practice', async () => {
  const response = await invoke({ formula: 'P & Q' });
  expect(response.statusCode).toBe(200);
  const solution = truthTableSolutionResponseSchema.parse(response.body);
  expect(solution.rows.map(row => row.values[columnId])).toEqual([true, false, false, false]);
});

test.each([{}, { formula: false }, { formula: 'P', extra: true }])('rejects invalid solution data %j', async body => {
  const response = await invoke(body);
  expect(response.statusCode).toBe(400);
  expect(truthTableErrorResponseSchema.parse(response.body).error.code).toBe('INVALID_REQUEST');
});
