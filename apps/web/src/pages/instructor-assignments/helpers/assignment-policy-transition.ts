import {
  AssessmentMode,
  SolutionAccess,
  FeedbackTiming,
} from '@logiclab/contracts/assignment-policy-values';
import { assignmentLearningPolicySchema, type AssignmentLearningPolicy } from '@logiclab/contracts';

/** Preserve immediate practice feedback and reset answer access that practice cannot use. */
export function assignmentPolicyTransition(
  policy: AssignmentLearningPolicy,
  assessmentMode: string,
) {
  const resetSolutions =
    assessmentMode === AssessmentMode.UngradedPractice &&
    ![SolutionAccess.Never, SolutionAccess.Anytime].some(
      (candidate) => candidate === policy.solutionAccess,
    );

  return {
    policy: assignmentLearningPolicySchema.parse({
      assessmentMode,
      feedbackTiming:
        assessmentMode === AssessmentMode.UngradedPractice
          ? policy.feedbackTiming === FeedbackTiming.Immediate
            ? FeedbackTiming.Immediate
            : FeedbackTiming.OnCheck
          : FeedbackTiming.OnSubmission,
      solutionAccess: resetSolutions ? SolutionAccess.Never : policy.solutionAccess,
    }),
    resetSolutions,
  };
}
