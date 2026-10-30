import { createAssignmentRequestSchema, updateAssignmentRequestSchema } from '@logiclab/contracts';
import { validAssignmentScoring } from './scoring-policy';
const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';

test.each(['completion_only', 'ungraded_practice'])(
  'score-free %s does not award points',
  (assessmentMode) => {
    expect(validAssignmentScoring({ assessmentMode }, [{ id: a }])).toBe(true);
    expect(validAssignmentScoring({ assessmentMode }, [{ id: a, maxPoints: null }])).toBe(true);
    expect(validAssignmentScoring({ assessmentMode }, [{ id: a, maxPoints: 10 }])).toBe(true);
  },
);

test('graded work requires a complete unique bounded allocation set', () => {
  const policy = { assessmentMode: 'graded' };
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
  ).toBe(true);
});

test('graded authoring defaults to points and mode switches are not accepted', () => {
  expect(createAssignmentRequestSchema.parse({ title: 'Default' }).assessmentMode).toBe('graded');
  expect(updateAssignmentRequestSchema.parse({ title: 'Metadata' })).toEqual({ title: 'Metadata' });
  expect(updateAssignmentRequestSchema.safeParse({ scoringVersion: null }).success).toBe(false);
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'Points',
      items: [{ problemVersionId: a, maxPoints: 20 }],
    }).success,
  ).toBe(true);
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'Wrong mode',
      assessmentMode: 'completion_only',
      items: [{ problemVersionId: a, maxPoints: 20 }],
    }).success,
  ).toBe(false);
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'Default points',
      items: [{ problemVersionId: a, maxPoints: 20 }],
    }).success,
  ).toBe(true);
  expect(
    createAssignmentRequestSchema.safeParse({
      title: 'Ambiguous',
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
