import { assignmentLearningPolicySchema } from '@logiclab/contracts';
import {
  assignmentLearningCapabilities,
  canViewAssignedSolution,
  legacyAssignmentLearningPolicy,
  resolveAssignmentLearningPolicy,
} from './learning-policy';

test.each([
  ['graded', 'on_submission', true, true, false, false],
  ['completion_only', 'immediate', true, false, true, true],
  ['ungraded_practice', 'immediate', false, false, false, true],
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
      allowsImmediateFeedback: feedbackTiming === 'immediate',
      instructorReviewsFinalSubmission: final,
    });
  },
);

test.each([
  ['graded', 'on_check', 'never'],
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

test('PATCH preserves omitted policy fields and rejects invalid combined transitions', () => {
  const practice = assignmentLearningPolicySchema.parse({
    assessmentMode: 'ungraded_practice',
    feedbackTiming: 'on_check',
    solutionAccess: 'anytime',
  });
  expect(resolveAssignmentLearningPolicy(practice, {})).toEqual(practice);
  expect(resolveAssignmentLearningPolicy(practice, { solutionAccess: undefined })).toEqual(
    practice,
  );
  expect(resolveAssignmentLearningPolicy(practice, { solutionAccess: 'never' })).toEqual({
    ...practice,
    solutionAccess: 'never',
  });
  expect(() => resolveAssignmentLearningPolicy(practice, { assessmentMode: 'graded' })).toThrow();
  expect(() =>
    resolveAssignmentLearningPolicy(practice, { solutionAccess: 'after_submission' }),
  ).toThrow();
  expect(
    resolveAssignmentLearningPolicy(practice, {
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
    }),
  ).toEqual({
    assessmentMode: 'graded',
    feedbackTiming: 'on_submission',
    solutionAccess: 'anytime',
  });
  expect(practice.assessmentMode).toBe('ungraded_practice');
});

test.each(['completion_only', 'ungraded_practice'] as const)(
  '%s can switch feedback timing without changing scoring or release rules',
  (assessmentMode) => {
    const original = assignmentLearningPolicySchema.parse({
      assessmentMode,
      feedbackTiming: 'on_check',
      solutionAccess: 'anytime',
    });
    const immediate = resolveAssignmentLearningPolicy(original, { feedbackTiming: 'immediate' });
    expect(immediate).toEqual({ ...original, feedbackTiming: 'immediate' });
    expect(assignmentLearningCapabilities(immediate)).toEqual({
      ...assignmentLearningCapabilities(original),
      allowsImmediateFeedback: true,
    });
    expect(canViewAssignedSolution(immediate, false)).toBe(true);
    expect(resolveAssignmentLearningPolicy(immediate, { feedbackTiming: 'on_check' })).toEqual(
      original,
    );
    expect(original.feedbackTiming).toBe('on_check');
  },
);

test('immediate practice still cannot release solutions after a nonexistent submission', () => {
  expect(
    assignmentLearningPolicySchema.safeParse({
      assessmentMode: 'ungraded_practice',
      feedbackTiming: 'immediate',
      solutionAccess: 'after_submission',
    }).success,
  ).toBe(false);
});
