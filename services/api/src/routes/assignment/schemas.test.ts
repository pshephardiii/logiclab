import {
  createAssignmentRequestSchema,
  updateAssignmentRequestSchema,
  assignmentListQuerySchema,
} from '@logiclab/contracts';

test('creation applies independent policy defaults while PATCH retains omission semantics', () => {
  expect(createAssignmentRequestSchema.parse({ title: '  Homework  ' })).toEqual({
    title: 'Homework',
    problemVersionIds: [],
    assessmentMode: 'graded',
    feedbackTiming: 'on_submission',
    solutionAccess: 'never',
  });
  expect(updateAssignmentRequestSchema.parse({ instructions: null })).toEqual({
    instructions: null,
  });
});
test.each([
  {},
  { title: ' ' },
  { title: 'x'.repeat(121) },
  { title: 'x', ownerId: 'spoof' },
  { title: 'x', classId: 'spoof' },
  { title: 'x', assessmentMode: 'completion' },
  { title: 'x', feedbackTiming: 'immediate' },
  { title: 'x', solutionAccess: false },
  { title: 'x', problemVersionIds: ['bad'] },
  { title: 'x', problemVersionIds: Array(51).fill('a1111111-1111-4111-8111-111111111111') },
  { title: 'x', instructions: 'x'.repeat(5001) },
])('rejects invalid authored assignments: %j', (input) => {
  expect(createAssignmentRequestSchema.safeParse(input).success).toBe(false);
});
test('PATCH rejects empty requests and classroom changes, query bounds are enforced', () => {
  expect(updateAssignmentRequestSchema.safeParse({}).success).toBe(false);
  expect(
    updateAssignmentRequestSchema.safeParse({ classId: 'a1111111-1111-4111-8111-111111111111' })
      .success,
  ).toBe(false);
  for (const query of [{ limit: 0 }, { limit: 51 }, { offset: -1 }, { archive: 'bad' }])
    expect(assignmentListQuerySchema.safeParse(query).success).toBe(false);
});
