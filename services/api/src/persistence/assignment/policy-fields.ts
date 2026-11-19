import type { AssignmentLearningPolicy } from '@logiclab/contracts';

export async function policyFields(policy: AssignmentLearningPolicy) {
  // Validated contract values now match persistence values without enum conversion.
  return {
    assessmentMode: policy.assessmentMode,
    feedbackTiming: policy.feedbackTiming,
    solutionAccess: policy.solutionAccess,
  };
}
