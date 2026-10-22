import type { AssignmentLearningPolicy } from '@logiclab/contracts';

/** Capabilities only: callers must still enforce enrollment, publication and attempt state. */
export function assignmentLearningCapabilities(policy: AssignmentLearningPolicy) {
  return {
    hasFinalSubmission: policy.assessmentMode !== 'ungraded_practice',
    recordsCorrectnessScore: policy.assessmentMode === 'graded',
    requiresAllAnswers: policy.assessmentMode === 'completion_only',
    allowsExplicitCheck: policy.feedbackTiming === 'on_check',
    instructorReviewsFinalSubmission: policy.assessmentMode !== 'ungraded_practice',
  };
}

export function canViewAssignedSolution(
  policy: AssignmentLearningPolicy,
  submitted: boolean,
): boolean {
  return (
    policy.solutionAccess === 'anytime' ||
    (policy.solutionAccess === 'after_submission' && submitted)
  );
}

/** Preserve the current graded/submission-only behavior when replacing allowSolutions. */
export function legacyAssignmentLearningPolicy(allowSolutions: boolean): AssignmentLearningPolicy {
  return {
    assessmentMode: 'graded',
    feedbackTiming: 'on_submission',
    solutionAccess: allowSolutions ? 'after_submission' : 'never',
  };
}
