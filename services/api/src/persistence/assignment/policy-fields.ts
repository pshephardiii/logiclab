import type { AssignmentLearningPolicy } from '@logiclab/contracts';

export async function policyFields(policy: AssignmentLearningPolicy) {
  const { AssessmentMode, FeedbackTiming, SolutionAccess } = await import('@logiclab/db');

  const modes = {
    graded: AssessmentMode.Graded,
    completion_only: AssessmentMode.CompletionOnly,
    ungraded_practice: AssessmentMode.UngradedPractice,
  };

  const timings = {
    on_submission: FeedbackTiming.OnSubmission,
    on_check: FeedbackTiming.OnCheck,
    immediate: FeedbackTiming.Immediate,
  };

  const solutions = {
    instructor_release: SolutionAccess.InstructorRelease,
    never: SolutionAccess.Never,
    after_submission: SolutionAccess.AfterSubmission,
    anytime: SolutionAccess.Anytime,
  };

  return {
    assessmentMode: modes[policy.assessmentMode],
    feedbackTiming: timings[policy.feedbackTiming],
    solutionAccess: solutions[policy.solutionAccess],
  };
}
