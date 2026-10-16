import { saveStudentAnswersSchema, submitStudentAttemptSchema } from '@logiclab/contracts';
const itemId = 'a3333333-3333-4333-8333-333333333333';
test('answer storage preserves false and blank null values', () => {
  const input = {
    revision: 0,
    itemId,
    answers: [
      { rowId: 'row', columnId: 'column', value: false },
      { rowId: 'other', columnId: 'column', value: null },
    ],
  };
  expect(saveStudentAnswersSchema.parse(input)).toEqual(input);
});
test.each([
  { revision: -1, itemId, answers: [] },
  { revision: 0, itemId: 'bad', answers: [] },
  { revision: 0, itemId, answers: [], studentId: 'spoof' },
  { revision: 0, itemId, answers: [], formula: 'P' },
  { revision: 0, itemId, answers: [], result: {} },
  { revision: 0, itemId, answers: [{ rowId: 'r', columnId: 'c', value: 'F' }] },
  { revision: 0, itemId, answers: [{ rowId: 'r', columnId: 'c', value: false, expected: false }] },
])('rejects forged work: %j', (input) =>
  expect(saveStudentAnswersSchema.safeParse(input).success).toBe(false),
);
test('submission requires a revision and accepts no answers or client grade', () => {
  expect(submitStudentAttemptSchema.safeParse({}).success).toBe(false);
  expect(submitStudentAttemptSchema.safeParse({ revision: 1, score: 100 }).success).toBe(false);
  expect(submitStudentAttemptSchema.safeParse({ revision: 1, answers: [] }).success).toBe(false);
});
