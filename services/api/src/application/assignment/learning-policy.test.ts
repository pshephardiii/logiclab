import { assignmentLearningPolicySchema } from '@logiclab/contracts';
import {
  assignmentLearningCapabilities,
  canViewAssignedSolution,
  legacyAssignmentLearningPolicy,
} from './learning-policy';

test.each([
  ['graded', 'on_submission', true, true, false, false],
  ['completion_only', 'on_check', true, false, true, true],
  ['ungraded_practice', 'on_check', false, false, false, true],
] as const)(
  '%s has the agreed submission, scoring, completeness and checking capabilities',
  (assessmentMode, feedbackTiming, final, score, complete, check) => {
    const policy = assignmentLearningPolicySchema.parse({
      assessmentMode,
      feedbackTiming,
      solutionAccess: 'never',
    });
    expect(assignmentLearningCapabilities(policy)).toEqual({
      hasFinalSubmission: final,
      recordsCorrectnessScore: score,
      requiresAllAnswers: complete,
      allowsExplicitCheck: check,
      instructorReviewsFinalSubmission: final,
    });
  },
);

test.each([
  ['graded', 'on_check', 'never'],
  ['completion_only', 'on_submission', 'never'],
  ['ungraded_practice', 'on_submission', 'never'],
  ['ungraded_practice', 'on_check', 'after_submission'],
  ['graded', 'immediate', 'never'],
  ['unknown', 'on_check', 'never'],
  ['graded', 'on_submission', 'sometimes'],
])('rejects unsupported policy %s/%s/%s', (assessmentMode, feedbackTiming, solutionAccess) => {
  expect(
    assignmentLearningPolicySchema.safeParse({
      assessmentMode,
      feedbackTiming,
      solutionAccess,
    }).success,
  ).toBe(false);
});

test.each(['graded', 'completion_only', 'ungraded_practice'] as const)(
  '%s supports never and anytime solutions without relying on submission',
  (assessmentMode) => {
    for (const submitted of [false, true]) {
      for (const solutionAccess of ['never', 'anytime'] as const) {
        const policy = assignmentLearningPolicySchema.parse({
          assessmentMode,
          feedbackTiming: assessmentMode === 'graded' ? 'on_submission' : 'on_check',
          solutionAccess,
        });
        expect(canViewAssignedSolution(policy, submitted)).toBe(solutionAccess === 'anytime');
      }
    }
  },
);

test.each(['graded', 'completion_only'] as const)('%s gates after-submission solutions', (mode) => {
  const policy = assignmentLearningPolicySchema.parse({
    assessmentMode: mode,
    feedbackTiming: mode === 'graded' ? 'on_submission' : 'on_check',
    solutionAccess: 'after_submission',
  });
  expect(canViewAssignedSolution(policy, false)).toBe(false);
  expect(canViewAssignedSolution(policy, true)).toBe(true);
});

test.each([false, true])(
  'legacy allowSolutions=%s retains its existing release rule',
  (allowed) => {
    const policy = legacyAssignmentLearningPolicy(allowed);
    expect(assignmentLearningPolicySchema.parse(policy)).toEqual(policy);
    expect(canViewAssignedSolution(policy, false)).toBe(false);
    expect(canViewAssignedSolution(policy, true)).toBe(allowed);
  },
);

test('policy contract requires all dimensions and rejects unknown fields', () => {
  expect(assignmentLearningPolicySchema.safeParse({ assessmentMode: 'graded' }).success).toBe(
    false,
  );
  expect(
    assignmentLearningPolicySchema.safeParse({
      ...legacyAssignmentLearningPolicy(false),
      allowSolutions: true,
    }).success,
  ).toBe(false);
});
