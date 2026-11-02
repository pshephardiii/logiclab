import { StudentWorkError } from './errors';

/** Completion proof diagnostics are post-submission, even when older objective work allows checks. */
export function assertProofWorkPolicy(assignment: {
  assessmentMode: string;
  feedbackTiming: string;
}) {
  if (
    assignment.assessmentMode === 'completion_only' &&
    assignment.feedbackTiming !== 'on_submission'
  )
    throw new StudentWorkError('unsupported_policy');
}
