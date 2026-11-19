import {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
} from '@logiclab/contracts/assignment-policy-values';
import { AssignmentOperationError } from './errors';
import { assignmentLearningPolicySchema, type AssignmentLearningPolicy } from '@logiclab/contracts';

/** Capabilities only: callers must still enforce enrollment, publication and attempt state. */
export function assignmentLearningCapabilities(policy: AssignmentLearningPolicy) {
  return {
    hasFinalSubmission: policy.assessmentMode !== AssessmentMode.UngradedPractice,
    recordsCorrectnessScore: policy.assessmentMode === AssessmentMode.Graded,
    requiresAllAnswers: policy.assessmentMode === AssessmentMode.CompletionOnly,
    allowsExplicitCheck: policy.feedbackTiming !== FeedbackTiming.OnSubmission,
    allowsImmediateFeedback: policy.feedbackTiming === FeedbackTiming.Immediate,
    instructorReviewsFinalSubmission: policy.assessmentMode !== AssessmentMode.UngradedPractice,
  };
}

export function canViewAssignedSolution(
  policy: AssignmentLearningPolicy,
  submitted: boolean,
  answersRevealed = false,
): boolean {
  return (
    policy.solutionAccess === SolutionAccess.Anytime ||
    (policy.solutionAccess === SolutionAccess.InstructorRelease && answersRevealed) ||
    (policy.solutionAccess === SolutionAccess.AfterSubmission && submitted)
  );
}

/** Preserve the current graded/submission-only behavior when replacing allowSolutions. */
export function legacyAssignmentLearningPolicy(allowSolutions: boolean): AssignmentLearningPolicy {
  return {
    assessmentMode: AssessmentMode.Graded,
    feedbackTiming: FeedbackTiming.OnSubmission,
    solutionAccess: allowSolutions ? SolutionAccess.AfterSubmission : SolutionAccess.Never,
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
