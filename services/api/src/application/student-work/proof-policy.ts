import { AssessmentMode, FeedbackTiming } from '@logiclab/contracts/assignment-policy-values';
import { StudentWorkError } from './errors';

/** Completion proof diagnostics are post-submission, even when older objective work allows checks. */
export function assertProofWorkPolicy(assignment: {
  assessmentMode: string;
  feedbackTiming: string;
}) {
  if (
    assignment.assessmentMode === AssessmentMode.CompletionOnly &&
    assignment.feedbackTiming !== FeedbackTiming.OnSubmission
  )
    throw new StudentWorkError('unsupported_policy');
}
