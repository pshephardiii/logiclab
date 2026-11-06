import { generateTruthTable } from '@logiclab/logic-engine';
import {
  truthTableCompletionSubmissionResultSchema,
  type TruthTableAnswer,
} from '@logiclab/contracts';
import { evaluateTruthTableCompletion } from './evaluation';

const first = 'a1111111-1111-4111-8111-111111111111';
const second = 'a2222222-2222-4222-8222-222222222222';
const items = [
  { id: first, formula: 'P' },
  { id: second, formula: 'P' },
];
const table = generateTruthTable('P');
const column = table.columns.find((value) => value.kind === 'answer')!;
const wrong = table.rows.map((row) => ({
  rowId: row.id,
  columnId: column.id,
  value: !row.values[column.id],
}));

test('every repeated occurrence must be complete; entirely incorrect work still completes without scores', () => {
  const result = evaluateTruthTableCompletion(items, { [first]: wrong, [second]: wrong });
  expect(result).toEqual({
    gradingVersion: 'completion_v1',
    items: items.map((item) => ({ itemId: item.id, completedCells: 2, totalCells: 2 })),
    summary: { completedCells: 4, totalCells: 4 },
  });
  expect(truthTableCompletionSubmissionResultSchema.parse(result)).toEqual(result);
});

const incompleteCases: Record<string, TruthTableAnswer[]>[] = [
  {},
  { [first]: wrong },
  { [first]: wrong, [second]: wrong.slice(0, 1) },
  { [first]: wrong, [second]: wrong.map((answer) => ({ ...answer, value: null })) },
];
test.each(incompleteCases)(
  'rejects missing or blank expected cells without treating false as blank: %j',
  (saved) => {
    expect(() => evaluateTruthTableCompletion(items, saved)).toThrow('incomplete_work');
  },
);

test('false values count as filled cells', () => {
  expect(
    evaluateTruthTableCompletion([items[0]!], {
      [first]: wrong.map((answer) => ({ ...answer, value: false })),
    }).summary,
  ).toEqual({ completedCells: 2, totalCells: 2 });
});

test('rejects duplicate/foreign cells rather than relying on submitted answer counts', () => {
  expect(() =>
    evaluateTruthTableCompletion([items[0]!], { [first]: [wrong[0]!, wrong[0]!] }),
  ).toThrow('duplicate_cell');
  expect(() =>
    evaluateTruthTableCompletion([items[0]!], {
      [first]: wrong.map((answer) => ({ ...answer, columnId: 'unknown' })),
    }),
  ).toThrow('invalid_cell');
  expect(() => evaluateTruthTableCompletion([], {})).toThrow('incomplete_work');
});

test('completion result contracts reject correctness counts or feedback fields', () => {
  const result = evaluateTruthTableCompletion([items[0]!], { [first]: wrong });
  expect(
    truthTableCompletionSubmissionResultSchema.safeParse({
      ...result,
      summary: { ...result.summary, correct: 2 },
    }).success,
  ).toBe(false);
  expect(
    truthTableCompletionSubmissionResultSchema.safeParse({
      ...result,
      items: [{ ...result.items[0], feedback: {} }],
    }).success,
  ).toBe(false);
});
