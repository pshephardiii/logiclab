/** Persistable assessment modes; API/workflow support is rolled out separately. */
export enum AssessmentMode {
  Graded = 'graded',
  CompletionOnly = 'completion_only',
  UngradedPractice = 'ungraded_practice',
}

/** Feedback timing is independent of assessment mode and solution access. */
export enum FeedbackTiming {
  OnSubmission = 'on_submission',
  OnCheck = 'on_check',
}
