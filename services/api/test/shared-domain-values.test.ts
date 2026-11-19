import * as contracts from '@logiclab/contracts';
import {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
  GradeReleaseTiming,
  assessmentModeSchema,
  feedbackTimingSchema,
  solutionAccessSchema,
  gradeReleaseTimingSchema,
} from '@logiclab/contracts/assignment-policy-values';
import { UserRole, userRoleSchema } from '@logiclab/contracts/user-role';

test.each([
  [
    'AssessmentMode',
    AssessmentMode,
    assessmentModeSchema,
    ['graded', 'completion_only', 'ungraded_practice'],
  ],
  [
    'FeedbackTiming',
    FeedbackTiming,
    feedbackTimingSchema,
    ['on_submission', 'on_check', 'immediate'],
  ],
  [
    'SolutionAccess',
    SolutionAccess,
    solutionAccessSchema,
    ['never', 'after_submission', 'anytime', 'instructor_release'],
  ],
  [
    'GradeReleaseTiming',
    GradeReleaseTiming,
    gradeReleaseTimingSchema,
    ['on_submission', 'instructor_release'],
  ],
  ['UserRole', UserRole, userRoleSchema, ['student', 'instructor']],
] as const)(
  '%s retains its public exports and exact wire values',
  (name, values, schema, expected) => {
    expect(contracts[name]).toBe(values);
    expect(Object.values(values)).toEqual(expected);
    expect(schema.options).toEqual(expected);

    for (const value of expected) {
      expect(schema.parse(value)).toBe(value);
    }

    for (const value of ['', 'unsupported', null]) {
      expect(schema.safeParse(value).success).toBe(false);
    }
  },
);

test('centralized values preserve all assignment-policy combination restrictions', () => {
  // Keep these wire values independent of the implementation's shared constants.
  for (const assessmentMode of ['graded', 'completion_only', 'ungraded_practice']) {
    for (const feedbackTiming of ['on_submission', 'on_check', 'immediate']) {
      for (const solutionAccess of ['never', 'after_submission', 'anytime', 'instructor_release']) {
        for (const gradeReleaseTiming of ['on_submission', 'instructor_release']) {
          const learningAllowed =
            assessmentMode === 'graded'
              ? feedbackTiming === 'on_submission'
              : assessmentMode === 'completion_only' ||
                (feedbackTiming !== 'on_submission' &&
                  ['never', 'anytime'].includes(solutionAccess));
          const gradesAllowed =
            assessmentMode === 'graded' || gradeReleaseTiming === 'on_submission';
          const policy = { assessmentMode, feedbackTiming, solutionAccess, gradeReleaseTiming };

          expect({
            policy,
            allowed: contracts.assignmentPolicySchema.safeParse(policy).success,
          }).toEqual({ policy, allowed: learningAllowed && gradesAllowed });
        }
      }
    }
  }
});

test('authentication and demo requests retain the same role validation', () => {
  const signup = { email: 'person@example.com', password: 'Example-password-123' };

  for (const role of ['student', 'instructor']) {
    expect(contracts.signupRequestSchema.parse({ ...signup, role }).role).toBe(role);
    expect(contracts.demoRoleRequestSchema.parse({ role })).toEqual({ role });
  }

  for (const role of ['admin', 'reference', '', null]) {
    expect(contracts.signupRequestSchema.safeParse({ ...signup, role }).success).toBe(false);
    expect(contracts.demoRoleRequestSchema.safeParse({ role }).success).toBe(false);
  }
});

test('authoring defaults and existing schema exports remain compatible', () => {
  expect(contracts.solutionAccessSchema).toBe(solutionAccessSchema);
  expect(contracts.gradeReleaseTimingSchema).toBe(gradeReleaseTimingSchema);
  expect(
    contracts.createAssignmentRequestSchema.parse({ title: 'Draft assignment' }),
  ).toMatchObject({
    assessmentMode: 'graded',
    feedbackTiming: 'on_submission',
    solutionAccess: 'never',
  });
});
