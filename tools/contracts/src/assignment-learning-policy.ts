import {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
  solutionAccessSchema,
  feedbackTimingSchema,
} from './assignment-policy-values';
import { z } from 'zod';

export { SolutionAccess, solutionAccessSchema } from './assignment-policy-values';

/**
 * Supported learning rules shared by authoring and student workflows.
 * Graded feedback stays submission-only; completion also retains legacy checking policies.
 */
export const assignmentLearningPolicySchema = z.discriminatedUnion('assessmentMode', [
  z.strictObject({
    assessmentMode: z.literal(AssessmentMode.Graded),
    feedbackTiming: z.literal(FeedbackTiming.OnSubmission),
    solutionAccess: solutionAccessSchema,
  }),
  z.strictObject({
    assessmentMode: z.literal(AssessmentMode.CompletionOnly),
    feedbackTiming: feedbackTimingSchema,
    solutionAccess: solutionAccessSchema,
  }),
  z.strictObject({
    assessmentMode: z.literal(AssessmentMode.UngradedPractice),
    feedbackTiming: z.enum([FeedbackTiming.OnCheck, FeedbackTiming.Immediate]),
    solutionAccess: z.enum([SolutionAccess.Never, SolutionAccess.Anytime]),
  }),
]);

export type AssignmentLearningPolicy = z.infer<typeof assignmentLearningPolicySchema>;
