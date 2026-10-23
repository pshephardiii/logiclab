import { z } from 'zod';

export const solutionAccessSchema = z.enum(['never', 'after_submission', 'anytime']);
export type SolutionAccess = z.infer<typeof solutionAccessSchema>;

/**
 * Supported learning rules shared by authoring and student workflows.
 * Graded work stays submission-only; practice and completion support checking.
 */
export const assignmentLearningPolicySchema = z.discriminatedUnion('assessmentMode', [
  z.strictObject({
    assessmentMode: z.literal('graded'),
    feedbackTiming: z.literal('on_submission'),
    solutionAccess: solutionAccessSchema,
  }),
  z.strictObject({
    assessmentMode: z.literal('completion_only'),
    feedbackTiming: z.enum(['on_check', 'immediate']),
    solutionAccess: solutionAccessSchema,
  }),
  z.strictObject({
    assessmentMode: z.literal('ungraded_practice'),
    feedbackTiming: z.enum(['on_check', 'immediate']),
    solutionAccess: z.enum(['never', 'anytime']),
  }),
]);
export type AssignmentLearningPolicy = z.infer<typeof assignmentLearningPolicySchema>;
