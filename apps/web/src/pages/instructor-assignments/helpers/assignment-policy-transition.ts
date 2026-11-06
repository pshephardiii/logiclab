import { assignmentLearningPolicySchema, type AssignmentLearningPolicy } from '@logiclab/contracts';

/** Preserve immediate practice feedback and reset answer access that practice cannot use. */
export function assignmentPolicyTransition(
  policy: AssignmentLearningPolicy,
  assessmentMode: string,
) {
  const resetSolutions =
    assessmentMode === 'ungraded_practice' && !['never', 'anytime'].includes(policy.solutionAccess);

  return {
    policy: assignmentLearningPolicySchema.parse({
      assessmentMode,
      feedbackTiming:
        assessmentMode === 'ungraded_practice'
          ? policy.feedbackTiming === 'immediate'
            ? 'immediate'
            : 'on_check'
          : 'on_submission',
      solutionAccess: resetSolutions ? 'never' : policy.solutionAccess,
    }),
    resetSolutions,
  };
}
