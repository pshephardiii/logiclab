import {
  createAssignmentRequestSchema,
  ASSIGNMENT_POINT_LIMITS,
  assignmentItemPointsSchema,
  assignmentPointAllocationsSchema,
  assignmentScoreSchema,
  submissionResultSchema,
  type AssignmentPointAllocation,
} from '@logiclab/contracts';
import {
  scoreAssignment,
  scoreObjectiveSubmission,
  AssignmentScoringError,
  type AssignmentScoringOutcome,
} from './scoring';
import {
  evaluateAssignmentSubmission,
  evaluateAssignmentCompletion,
} from '../student-work/mixed-evaluation';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';
const allocations = [
  { itemId: a, maxPoints: 20 },
  { itemId: b, maxPoints: 5 },
];
const fraction = (itemId: string, correct: number, total: number): AssignmentScoringOutcome => ({
  itemId,
  outcome: { type: 'correctness', correct, total },
});
const full = (itemId: string): AssignmentScoringOutcome => ({
  itemId,
  outcome: { type: 'full_credit' },
});

test('positive whole-point allocations are explicit and default authoring policy is ten points', () => {
  expect(ASSIGNMENT_POINT_LIMITS.defaultPoints).toBe(10);
  expect(assignmentItemPointsSchema.parse(1)).toBe(1);
  expect(assignmentItemPointsSchema.parse(1000)).toBe(1000);
  expect(assignmentItemPointsSchema.safeParse(undefined).success).toBe(false);
});

test.each([0, -1, 0.5, 10.25, 1001, NaN, Infinity, '10'])(
  'rejects invalid maximum points %p',
  (value) => {
    expect(assignmentItemPointsSchema.safeParse(value).success).toBe(false);
  },
);

test('weights apply per occurrence rather than pooling correct cells/questions', () => {
  const score = scoreAssignment(allocations, [fraction(a, 1, 2), fraction(b, 1, 1)]);
  expect(score.items).toEqual([
    { ...allocations[0], status: 'graded', earnedPoints: 10 },
    { ...allocations[1], status: 'graded', earnedPoints: 5 },
  ]);
  expect(score.summary).toEqual({
    status: 'graded',
    maxPoints: 25,
    earnedPoints: 15,
    percentage: 60,
  });
});

test('scores are rounded to hundredths per item, then totals are summed without floating-point drift', () => {
  const score = scoreAssignment(
    [
      { itemId: a, maxPoints: 10 },
      { itemId: b, maxPoints: 10 },
    ],
    [fraction(a, 1, 3), fraction(b, 1, 3)],
  );
  expect(score.items.map((item) => item.earnedPoints)).toEqual([3.33, 3.33]);
  expect(score.summary).toEqual({
    status: 'graded',
    maxPoints: 20,
    earnedPoints: 6.66,
    percentage: 33.3,
  });
  const decimals = scoreAssignment(
    [
      { itemId: a, maxPoints: 1 },
      { itemId: b, maxPoints: 1 },
    ],
    [fraction(a, 1, 10), fraction(b, 2, 10)],
  );
  expect(decimals.summary.earnedPoints).toBe(0.3);
});

test('rounding uses half-up for nonnegative scores and explicit zero is a completed grade', () => {
  expect(
    scoreAssignment([{ itemId: a, maxPoints: 1 }], [fraction(a, 1, 8)]).summary.earnedPoints,
  ).toBe(0.13);
  expect(scoreAssignment([{ itemId: a, maxPoints: 10 }], [fraction(a, 0, 2)]).summary).toEqual({
    status: 'graded',
    maxPoints: 10,
    earnedPoints: 0,
    percentage: 0,
  });
});

test('review-needed leaves item and assignment numeric grades unresolved while retaining other earned items', () => {
  const score = scoreAssignment(allocations, [
    full(a),
    { itemId: b, outcome: { type: 'needs_review' } },
  ]);
  expect(score.items[0]!.earnedPoints).toBe(20);
  expect(score.items[1]).toEqual({ ...allocations[1], status: 'needs_review', earnedPoints: null });
  expect(score.summary).toEqual({
    status: 'needs_review',
    maxPoints: 25,
    earnedPoints: null,
    percentage: null,
  });
});

test('repeated versions are independently weighted by occurrence ID; input order cannot redirect scores', () => {
  const score = scoreAssignment(allocations, [fraction(b, 0, 1), full(a)]);
  expect(score.items.map((item) => [item.itemId, item.earnedPoints])).toEqual([
    [a, 20],
    [b, 0],
  ]);
  expect(score.summary.percentage).toBe(80);
});

test('UUID identity is canonical and differently cased duplicate IDs fail closed', () => {
  expect(
    scoreAssignment([{ itemId: a.toUpperCase(), maxPoints: 10 }], [full(a)]).items[0]!.itemId,
  ).toBe(a);
  expect(
    assignmentPointAllocationsSchema.safeParse([
      { itemId: a, maxPoints: 10 },
      { itemId: a.toUpperCase(), maxPoints: 10 },
    ]).success,
  ).toBe(false);
  expect(() =>
    scoreAssignment([{ itemId: a, maxPoints: 10 }], [full(a), full(a.toUpperCase())]),
  ).toThrow(AssignmentScoringError);
});

test.each(
  [
    [],
    [full(a)],
    [full(a), full(a)],
    [full(a), full(c)],
    [fraction(a, 2, 1), full(b)],
    [fraction(a, -1, 1), full(b)],
    [fraction(a, 0, 0), full(b)],
    [fraction(a, 0.5, 2), full(b)],
    [fraction(a, NaN, 2), full(b)],
    [fraction(a, 1, Infinity), full(b)],
  ].map((outcomes) => ({ outcomes })),
)('requires a complete valid one-to-one outcome mapping: $outcomes', ({ outcomes }) => {
  expect(() => scoreAssignment(allocations, outcomes)).toThrow(AssignmentScoringError);
});

test('empty assignments and excessive allocations fail rather than creating zero-total grades', () => {
  expect(() => scoreAssignment([], [])).toThrow(AssignmentScoringError);
  const many = Array.from({ length: 51 }, (_, index) => ({
    itemId: `d1111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    maxPoints: 1000,
  }));
  expect(() =>
    scoreAssignment(
      many,
      many.map((item) => full(item.itemId)),
    ),
  ).toThrow(AssignmentScoringError);
  const bounded = many.slice(0, 50);
  expect(
    scoreAssignment(
      bounded,
      bounded.map((item) => full(item.itemId)),
    ).summary,
  ).toEqual({ status: 'graded', maxPoints: 50000, earnedPoints: 50000, percentage: 100 });
});

test('snapshot contracts reject inconsistent totals, finished pending work and over-allocation', () => {
  const score = scoreAssignment(allocations, [full(a), full(b)]);
  expect(
    assignmentScoreSchema.safeParse({ ...score, summary: { ...score.summary, earnedPoints: 24 } })
      .success,
  ).toBe(false);
  expect(
    assignmentScoreSchema.safeParse({ ...score, summary: { ...score.summary, percentage: 99 } })
      .success,
  ).toBe(false);
  expect(
    assignmentScoreSchema.safeParse({ ...score, summary: { ...score.summary, maxPoints: 26 } })
      .success,
  ).toBe(false);
  expect(
    assignmentScoreSchema.safeParse({ ...score, items: [score.items[0], score.items[0]] }).success,
  ).toBe(false);
  expect(
    assignmentScoreSchema.safeParse({
      ...score,
      items: [{ ...score.items[0], earnedPoints: 21 }, score.items[1]],
    }).success,
  ).toBe(false);
  expect(
    assignmentScoreSchema.safeParse({
      ...score,
      items: [{ ...score.items[0], earnedPoints: 1.001 }, score.items[1]],
    }).success,
  ).toBe(false);
  expect(
    assignmentScoreSchema.safeParse({
      ...score,
      items: [{ ...score.items[0], status: 'needs_review', earnedPoints: null }, score.items[1]],
    }).success,
  ).toBe(false);
  expect(
    assignmentScoreSchema.safeParse({
      ...score,
      summary: { status: 'needs_review', maxPoints: 25, earnedPoints: 0, percentage: null },
    }).success,
  ).toBe(false);
});

test('legacy and mixed objective evidence can be explicitly scored without changing retained reports', () => {
  const table = {
    id: a,
    definition: { type: 'truth_table' as const, definitionVersion: 1 as const, formula: 'P' },
  };
  const truth = {
    id: b,
    definition: {
      type: 'true_false' as const,
      definitionVersion: 1 as const,
      question: 'Question',
      correctAnswer: false,
    },
  };
  const legacy = evaluateAssignmentSubmission([table], {});
  const copy = JSON.stringify(legacy);
  expect(scoreObjectiveSubmission([allocations[0]!], legacy).summary.earnedPoints).toBe(0);
  expect(JSON.stringify(legacy)).toBe(copy);
  expect(submissionResultSchema.parse(legacy)).toEqual(legacy);
  const mixed = evaluateAssignmentSubmission([table, truth], {
    [b]: { type: 'true_false', answer: false },
  });
  const frozen = JSON.stringify(mixed);
  expect(scoreObjectiveSubmission(allocations, mixed).summary.earnedPoints).toBe(5);
  expect(JSON.stringify(mixed)).toBe(frozen);
  expect(submissionResultSchema.parse(mixed)).toEqual(mixed);
  expect(
    submissionResultSchema.safeParse(scoreObjectiveSubmission(allocations, mixed)).success,
  ).toBe(false);
});

test('completion/private work and corrupted objective summaries cannot be mistaken for graded scores', () => {
  const truth = {
    id: a,
    definition: {
      type: 'true_false' as const,
      definitionVersion: 1 as const,
      question: 'Question',
      correctAnswer: false,
    },
  };
  const completion = evaluateAssignmentCompletion([truth], {
    [a]: { type: 'true_false', answer: false },
  });
  expect(() => scoreObjectiveSubmission([allocations[0]!], completion)).toThrow(
    AssignmentScoringError,
  );
  expect(() => scoreObjectiveSubmission([allocations[0]!], null)).toThrow(AssignmentScoringError);
  const result = evaluateAssignmentSubmission([truth], {});
  expect(() =>
    scoreObjectiveSubmission([allocations[0]!], {
      ...result,
      summary: { correct: 1, incorrect: 0, unanswered: 0, total: 1 },
    }),
  ).toThrow(AssignmentScoringError);
});

test('scoring leaves frozen inputs untouched and emits independent JSON-safe snapshots', () => {
  const source: AssignmentPointAllocation[] = [{ itemId: a, maxPoints: 10 }];
  Object.freeze(source[0]);
  Object.freeze(source);
  const input = [full(a)];
  Object.freeze(input[0]!.outcome);
  Object.freeze(input[0]);
  Object.freeze(input);
  const score = scoreAssignment(source, input);
  expect(assignmentScoreSchema.parse(JSON.parse(JSON.stringify(score)))).toEqual(score);
  expect(score.items[0]).not.toBe(source[0]);
});

test('staged allocations do not silently expand active assignment authoring requests', () => {
  expect(createAssignmentRequestSchema.safeParse({ title: 'Staged', maxPoints: 10 }).success).toBe(
    false,
  );
});
