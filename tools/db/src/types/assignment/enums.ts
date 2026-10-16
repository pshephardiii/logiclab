/** Supported assessment modes; additional modes require database and application policy changes. */
export enum AssessmentMode {
  Graded = 'graded',
}

/** Feedback timing is independent of assessment mode and solution access. */
export enum FeedbackTiming {
  OnSubmission = 'on_submission',
}
