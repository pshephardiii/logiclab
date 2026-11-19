import { z } from 'zod';

/** Shared wire values; valid combinations remain the responsibility of policy schemas. */
export const AssessmentMode = {
  Graded: 'graded',
  CompletionOnly: 'completion_only',
  UngradedPractice: 'ungraded_practice',
} as const;

export type AssessmentMode = (typeof AssessmentMode)[keyof typeof AssessmentMode];

export const assessmentModeSchema = z.enum(AssessmentMode);

export const FeedbackTiming = {
  OnSubmission: 'on_submission',
  OnCheck: 'on_check',
  Immediate: 'immediate',
} as const;

export type FeedbackTiming = (typeof FeedbackTiming)[keyof typeof FeedbackTiming];

export const feedbackTimingSchema = z.enum(FeedbackTiming);

/** Answer reveal is independent from grade and correctness-report release. */
export const SolutionAccess = {
  Never: 'never',
  AfterSubmission: 'after_submission',
  Anytime: 'anytime',
  InstructorRelease: 'instructor_release',
} as const;

export type SolutionAccess = (typeof SolutionAccess)[keyof typeof SolutionAccess];

export const solutionAccessSchema = z.enum(SolutionAccess);

/** Non-graded work retains the inert submission default, not a grade-release control. */
export const GradeReleaseTiming = {
  OnSubmission: 'on_submission',
  InstructorRelease: 'instructor_release',
} as const;

export type GradeReleaseTiming = (typeof GradeReleaseTiming)[keyof typeof GradeReleaseTiming];

export const gradeReleaseTimingSchema = z.enum(GradeReleaseTiming);
