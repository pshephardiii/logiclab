import { createAssignmentRequestSchema, updateAssignmentRequestSchema } from '@logiclab/contracts';
import { validAssignmentScoring } from './scoring-policy';
const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';

test.each(['graded', 'completion_only', 'ungraded_practice'])(
  'legacy %s permits null allocations',
  (assessmentMode) => {
    expect(validAssignmentScoring({ assessmentMode }, [{ id: a }])).toBe(true);
    expect(
      validAssignmentScoring({ assessmentMode, scoringVersion: null }, [
        { id: a, maxPoints: null },
      ]),
    ).toBe(true);
    expect(validAssignmentScoring({ assessmentMode }, [{ id: a, maxPoints: 10 }])).toBe(false);
  },
);

test('point scoring needs graded work, known version and a complete unique bounded allocation set', () => {
  const policy = { assessmentMode: 'graded', scoringVersion: 'points_v1' };
  expect(
    validAssignmentScoring(policy, [
      { id: a, maxPoints: 20 },
      { id: b, maxPoints: 5 },
    ]),
  ).toBe(true);
  for (const items of [
    [],
    [{ id: a }],
    [{ id: a, maxPoints: null }],
    [{ id: a, maxPoints: 0 }],
    [{ id: a, maxPoints: 1001 }],
    [
      { id: a, maxPoints: 5 },
      { id: a.toUpperCase(), maxPoints: 5 },
    ],
  ])
    expect(validAssignmentScoring(policy, items)).toBe(false);
  expect(
    validAssignmentScoring({ ...policy, assessmentMode: 'completion_only' }, [
      { id: a, maxPoints: 10 },
    ]),
  ).toBe(false);
  expect(
    validAssignmentScoring({ ...policy, scoringVersion: 'future' }, [{ id: a, maxPoints: 10 }]),
  ).toBe(false);
});

test('new scoring authoring is explicit; old create defaults and PATCH omission are preserved', () => {
  expect(createAssignmentRequestSchema.parse({ title: 'Legacy' }).scoringVersion).toBeUndefined();
  expect(updateAssignmentRequestSchema.parse({ title: 'Metadata' })).toEqual({ title: 'Metadata' });
  expect(updateAssignmentRequestSchema.parse({ scoringVersion: null })).toEqual({
    scoringVersion: null,
  });
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'Points',
      scoringVersion: 'points_v1',
      items: [{ problemVersionId: a, maxPoints: 20 }],
    }).success,
  ).toBe(true);
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'Wrong mode',
      assessmentMode: 'completion_only',
      scoringVersion: 'points_v1',
    }).success,
  ).toBe(false);
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'No opt-in',
      items: [{ problemVersionId: a, maxPoints: 20 }],
    }).success,
  ).toBe(false);
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'Ambiguous',
      scoringVersion: 'points_v1',
      problemVersionIds: [b],
      items: [{ problemVersionId: a, maxPoints: 20 }],
    }).success,
  ).toBe(false);
});

test('PATCH rejects mixed item-replacement/allocation forms and out-of-bounds points', () => {
  const items = [{ problemVersionId: a, maxPoints: 10 }];
  const pointAllocations = [{ itemId: b, maxPoints: 5 }];
  for (const input of [
    { items, problemVersionIds: [] },
    { items, pointAllocations },
    { pointAllocations, problemVersionIds: [a] },
    { items: [{ problemVersionId: a, maxPoints: 0 }] },
  ])
    expect(updateAssignmentRequestSchema.safeParse(input).success).toBe(false);
  expect(updateAssignmentRequestSchema.safeParse({ pointAllocations }).success).toBe(true);
});
