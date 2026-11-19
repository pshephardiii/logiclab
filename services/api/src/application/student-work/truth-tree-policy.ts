import { StudentWorkError } from './errors';

/** Temporary rollout boundary: final-submission truth-tree workflows are integrated separately. */
export function assertTruthTreePracticePolicy(assignment: {
  assessmentMode: string;
  feedbackTiming: string;
}) {
  if (
    assignment.assessmentMode !== 'ungraded_practice' ||
    !['on_check', 'immediate'].includes(assignment.feedbackTiming)
  )
    throw new StudentWorkError('unsupported_policy');
}
