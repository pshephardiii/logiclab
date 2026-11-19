import { AssessmentMode, FeedbackTiming } from '@logiclab/contracts/assignment-policy-values';
import { StudentWorkError } from './errors';

/** Final-submission tree diagnostics must remain unavailable before submission. */
export function assertTruthTreeWorkPolicy(assignment: {
  assessmentMode: string;
  feedbackTiming: string;
}) {
  if (
    !(assignment.assessmentMode === AssessmentMode.UngradedPractice
      ? [FeedbackTiming.OnCheck, FeedbackTiming.Immediate].some(
          (candidate) => candidate === assignment.feedbackTiming,
        )
      : [AssessmentMode.Graded, AssessmentMode.CompletionOnly].some(
          (candidate) => candidate === assignment.assessmentMode,
        ) && assignment.feedbackTiming === FeedbackTiming.OnSubmission)
  )
    throw new StudentWorkError('unsupported_policy');
}
