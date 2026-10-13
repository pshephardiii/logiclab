import { postExerciseHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { truthTableExerciseResponseSchema, truthTableErrorResponseSchema } from '@logiclab/contracts';

const invoke = (body: unknown) => invokeHandler(postExerciseHandler, body);
const columnId = 'expr:v1:(P ∧ Q)';

test('exercise includes given values and answer metadata without leaking expected answers', async () => {
  const response = await invoke({ formula: 'P & Q' });
  expect(response.statusCode).toBe(200);
  const exercise = truthTableExerciseResponseSchema.parse(response.body);
  expect(exercise.rows).toHaveLength(4);
  expect(exercise.columns.find(column => column.isFinal)?.id).toBe(columnId);
  for (const row of exercise.rows) {
    expect(Object.keys(row.values)).toEqual(['var:v1:P', 'var:v1:Q']);
    expect(row.values).not.toHaveProperty(columnId);
  }
  expect(exercise.rows[0]!.values).toEqual({ 'var:v1:P': true, 'var:v1:Q': true });
});

test.each([{}, null, { formula: 1 }, { formula: '' }, { formula: 'P', paid: true }, { formula: 'P'.repeat(257) }])
  ('rejects invalid exercise request %j', async payload => {
    const response = await invoke(payload);
    expect(response.statusCode).toBe(400);
    expect(truthTableErrorResponseSchema.parse(response.body).error.code).toBe('INVALID_REQUEST');
  });
