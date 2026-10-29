import { AssignmentOperationError } from './errors';
import { assignmentLearningPolicySchema, type AssignmentLearningPolicy } from '@logiclab/contracts';

/** Capabilities only: callers must still enforce enrollment, publication and attempt state. */
export function assignmentLearningCapabilities(policy: AssignmentLearningPolicy) {
  return {
    hasFinalSubmission: policy.assessmentMode !== 'ungraded_practice',
    recordsCorrectnessScore: policy.assessmentMode === 'graded',
    requiresAllAnswers: policy.assessmentMode === 'completion_only',
    allowsExplicitCheck: policy.feedbackTiming !== 'on_submission',
    allowsImmediateFeedback: policy.feedbackTiming === 'immediate',
    instructorReviewsFinalSubmission: policy.assessmentMode !== 'ungraded_practice',
  };
}

export function canViewAssignedSolution(
  policy: AssignmentLearningPolicy,
  submitted: boolean,
  answersRevealed = false,
): boolean {
  return (
    policy.solutionAccess === 'anytime' ||
    (policy.solutionAccess === 'instructor_release' && answersRevealed) ||
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

/** PATCH omission retains saved policy; validate all dimensions together before any mutation. */
export function resolveAssignmentLearningPolicy(
  current: AssignmentLearningPolicy,
  patch: {
    assessmentMode?: AssignmentLearningPolicy['assessmentMode'];
    feedbackTiming?: AssignmentLearningPolicy['feedbackTiming'];
    solutionAccess?: AssignmentLearningPolicy['solutionAccess'];
  },
): AssignmentLearningPolicy {
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  const result = assignmentLearningPolicySchema.safeParse({ ...current, ...defined });
  if (!result.success) throw new AssignmentOperationError('invalid_policy');
  return result.data;
}
