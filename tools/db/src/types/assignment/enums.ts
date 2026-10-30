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
  Immediate = 'immediate',
}

/** When students may access assigned solutions. */
export enum SolutionAccess {
  Never = 'never',
  AfterSubmission = 'after_submission',
  Anytime = 'anytime',
  InstructorRelease = 'instructor_release',
}

/** Only graded work exposes this control; other modes retain the inert submission default. */
export enum GradeReleaseTiming {
  OnSubmission = 'on_submission',
  InstructorRelease = 'instructor_release',
}
