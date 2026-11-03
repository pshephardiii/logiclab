import {
  INSTRUCTOR_GRADING_LIMITS,
  instructorGradingSchema,
  updateSubmissionGradingSchema,
  type InstructorGradingEntry,
} from '@logiclab/contracts';
import { effectiveAssignmentScore, InstructorGradingError } from './instructor-grading';
import { scoreAssignment } from './scoring';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';
const actor = 'd4444444-4444-4444-8444-444444444444';
const automatic = scoreAssignment(
  [
    { itemId: a, maxPoints: 20 },
    { itemId: b, maxPoints: 5 },
    { itemId: c, maxPoints: 5 },
  ],
  [
    { itemId: a, outcome: { type: 'needs_review' } },
    { itemId: b, outcome: { type: 'full_credit' } },
    { itemId: c, outcome: { type: 'needs_review' } },
  ],
);
function entry(
  itemId: string,
  earnedPoints: number | null,
  comment: string | null = null,
): InstructorGradingEntry {
  return {
    itemId,
    earnedPoints,
    comment,
    reviewedBy: actor,
    reviewedAt: '2026-11-03T12:00:00.000Z',
  };
}
function grading(items: InstructorGradingEntry[]) {
  return {
    gradingVersion: 'instructor_grading_v1' as const,
    revision: items.length ? 1 : 0,
    items,
  };
}

test('no instructor decisions retain a detached automatic score without turning pending points into zero', () => {
  const result = effectiveAssignmentScore(automatic, grading([]));
  expect(result).toEqual(automatic);
  expect(result).not.toBe(automatic);
  result.items[0]!.maxPoints = 1;
  expect(automatic.items[0]!.maxPoints).toBe(20);
});

test('partial review retains other automatic awards while the assignment remains unresolved', () => {
  const result = effectiveAssignmentScore(automatic, grading([entry(a, 12.25)]));
  expect(result.items).toEqual([
    { itemId: a, maxPoints: 20, status: 'graded', earnedPoints: 12.25 },
    automatic.items[1],
    automatic.items[2],
  ]);
  expect(result.summary).toEqual({
    status: 'needs_review',
    maxPoints: 30,
    earnedPoints: null,
    percentage: null,
  });
});

test('explicit zero resolves review and totals use frozen maxima, independent of decision order', () => {
  const decisions = grading([
    entry(c, 0, 'The cited inference does not establish the target.'),
    entry(a, 12.25),
  ]);
  const before = structuredClone({ automatic, decisions });
  const result = effectiveAssignmentScore(automatic, decisions);
  expect(result.items.map((item) => item.itemId)).toEqual([a, b, c]);
  expect(result.items[2]).toMatchObject({ status: 'graded', earnedPoints: 0 });
  expect(result.summary).toEqual({
    status: 'graded',
    maxPoints: 30,
    earnedPoints: 17.25,
    percentage: 57.5,
  });
  expect({ automatic, decisions }).toEqual(before);
  expect(automatic.summary.status).toBe('needs_review');
  expect(JSON.stringify(result)).not.toContain('cited inference');
  expect(JSON.stringify(result)).not.toContain(actor);
});

test('automatically graded items can be corrected and decimal awards sum in hundredths', () => {
  const result = effectiveAssignmentScore(
    automatic,
    grading([entry(a, 0.1), entry(b, 0.2), entry(c, 0)]),
  );
  expect(result.summary).toEqual({
    status: 'graded',
    maxPoints: 30,
    earnedPoints: 0.3,
    percentage: 1,
  });
  expect(automatic.items[1]!.earnedPoints).toBe(5);
});

test('comment-only decisions do not resolve pending grades, and null awards restore automatic behavior', () => {
  const awarded = effectiveAssignmentScore(automatic, grading([entry(a, 20), entry(c, 5)]));
  expect(awarded.summary.status).toBe('graded');
  const restored = effectiveAssignmentScore(
    automatic,
    grading([entry(a, null, 'Please review line 3.'), entry(c, 5)]),
  );
  expect(restored.items[0]).toEqual(automatic.items[0]);
  expect(restored.summary.status).toBe('needs_review');
  expect(effectiveAssignmentScore(automatic, grading([entry(b, null, 'Well done.')]))).toEqual(
    automatic,
  );
});

test('review decisions bind to occurrence identity, including canonical UUID spelling, rather than array position', () => {
  const result = effectiveAssignmentScore(automatic, grading([entry(a.toUpperCase(), 8)]));
  expect(result.items[0]!.earnedPoints).toBe(8);
  expect(result.items[1]).toEqual(automatic.items[1]);
  expect(() => effectiveAssignmentScore(automatic, grading([entry(actor, 1)]))).toThrow(
    InstructorGradingError,
  );
  expect(() => effectiveAssignmentScore(automatic, grading([entry(b, 5.01)]))).toThrow(
    InstructorGradingError,
  );
});

test.each([-1, 1000.01, 1.001, NaN, Infinity, '5'])(
  'grading requests reject invalid earned points %p without rounding or coercion',
  (earnedPoints) => {
    expect(
      updateSubmissionGradingSchema.safeParse({
        revision: 0,
        items: [{ itemId: a, earnedPoints, comment: null }],
      }).success,
    ).toBe(false);
  },
);

test('grading requests accept zero, hundredths, maximum awards and explicit comment clearing', () => {
  for (const earnedPoints of [0, 0.01, 1000, null]) {
    expect(
      updateSubmissionGradingSchema.parse({
        revision: 0,
        items: [{ itemId: a, earnedPoints, comment: null }],
      }).items[0]!.earnedPoints,
    ).toBe(earnedPoints);
  }
  const comment = '<b>Explain this inference.</b>';
  expect(
    updateSubmissionGradingSchema.parse({
      revision: 0,
      items: [{ itemId: a, earnedPoints: null, comment: `  ${comment}  ` }],
    }).items[0]!.comment,
  ).toBe(comment);
});

test('comments and decision batches are bounded and normalized duplicate occurrences are rejected', () => {
  const item = {
    itemId: a,
    earnedPoints: 1,
    comment: 'x'.repeat(INSTRUCTOR_GRADING_LIMITS.maxCommentLength),
  };
  expect(updateSubmissionGradingSchema.safeParse({ revision: 0, items: [item] }).success).toBe(
    true,
  );
  for (const comment of ['', '   ', item.comment + 'x'])
    expect(
      updateSubmissionGradingSchema.safeParse({ revision: 0, items: [{ ...item, comment }] })
        .success,
    ).toBe(false);
  expect(
    updateSubmissionGradingSchema.safeParse({
      revision: 0,
      items: [item, { ...item, itemId: a.toUpperCase() }],
    }).success,
  ).toBe(false);
  expect(updateSubmissionGradingSchema.safeParse({ revision: 0, items: [] }).success).toBe(false);
  expect(
    updateSubmissionGradingSchema.safeParse({
      revision: 0,
      items: Array.from({ length: 51 }, () => item),
    }).success,
  ).toBe(false);
});

test.each([
  { reviewedBy: actor },
  { reviewedAt: '2026-11-03T12:00:00.000Z' },
  { maxPoints: 1000 },
  { report: {} },
  { referenceProof: {} },
])('grading requests cannot author server/evidence fields %j', (injected) => {
  const item = { itemId: a, earnedPoints: 1, comment: null };
  expect(
    updateSubmissionGradingSchema.safeParse({ revision: 0, items: [{ ...item, ...injected }] })
      .success,
  ).toBe(false);
  expect(
    updateSubmissionGradingSchema.safeParse({ revision: 0, items: [item], ...injected }).success,
  ).toBe(false);
});

test.each([-1, 0.5, 2147483648, '0', undefined])(
  'grading requests reject invalid concurrency revision %p',
  (revision) => {
    expect(
      updateSubmissionGradingSchema.safeParse({
        revision,
        items: [{ itemId: a, earnedPoints: 1, comment: null }],
      }).success,
    ).toBe(false);
  },
);

test('saved grading requires supported versions, unique occurrences and valid server metadata', () => {
  const item = entry(a, 1);
  for (const invalid of [
    { ...grading([item]), gradingVersion: 'unknown' },
    { ...grading([item]), revision: 0 },
    { ...grading([]), revision: 1 },
    grading([item, { ...item, itemId: a.toUpperCase() }]),
    grading([{ ...item, reviewedBy: 'not-a-user' }]),
    grading([{ ...item, reviewedAt: 'yesterday' }]),
    { ...grading([item]), score: automatic },
  ]) {
    expect(instructorGradingSchema.safeParse(invalid).success).toBe(false);
    expect(() => effectiveAssignmentScore(automatic, invalid)).toThrow(InstructorGradingError);
  }
});

test('invalid automatic evidence cannot be repaired by an instructor override or converted into a score', () => {
  for (const invalid of [
    null,
    {},
    { ...automatic, summary: { ...automatic.summary, maxPoints: 999 } },
  ])
    expect(() => effectiveAssignmentScore(invalid, grading([entry(a, 20)]))).toThrow(
      InstructorGradingError,
    );
});
