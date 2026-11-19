import { StudentWorkError } from './errors';

/** Final-submission tree diagnostics must remain unavailable before submission. */
export function assertTruthTreeWorkPolicy(assignment: {
  assessmentMode: string;
  feedbackTiming: string;
}) {
  if (
    !(assignment.assessmentMode === 'ungraded_practice'
      ? ['on_check', 'immediate'].includes(assignment.feedbackTiming)
      : ['graded', 'completion_only'].includes(assignment.assessmentMode) &&
        assignment.feedbackTiming === 'on_submission')
  )
    throw new StudentWorkError('unsupported_policy');
}
