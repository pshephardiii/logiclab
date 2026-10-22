import { z } from 'zod';

export const solutionAccessSchema = z.enum(['never', 'after_submission', 'anytime']);
export type SolutionAccess = z.infer<typeof solutionAccessSchema>;

/**
 * Target policy for learning modes. Existing assignment endpoints retain their legacy
 * contract until persistence and student workflows implement this policy.
 */
export const assignmentLearningPolicySchema = z.discriminatedUnion('assessmentMode', [
  z.strictObject({
    assessmentMode: z.literal('graded'),
    feedbackTiming: z.literal('on_submission'),
    solutionAccess: solutionAccessSchema,
  }),
  z.strictObject({
    assessmentMode: z.literal('completion_only'),
    feedbackTiming: z.literal('on_check'),
    solutionAccess: solutionAccessSchema,
  }),
  z.strictObject({
    assessmentMode: z.literal('ungraded_practice'),
    feedbackTiming: z.literal('on_check'),
    solutionAccess: z.enum(['never', 'anytime']),
  }),
]);
export type AssignmentLearningPolicy = z.infer<typeof assignmentLearningPolicySchema>;
