import { z } from 'zod';
import { conceptualAnswerSchema } from './conceptual-question';
import { truthTableAnswerSchema, truthTableCheckResponseSchema } from './truth-table';

/** Stored per occurrence: preserve legacy table arrays and use tagged conceptual responses. */
export const assignmentResponseValueSchema = z.union([
  z.array(truthTableAnswerSchema).max(4096),
  conceptualAnswerSchema,
]);
export const assignmentResponsesSchema = z
  .record(z.uuid(), assignmentResponseValueSchema)
  .refine((responses) => Object.keys(responses).length <= 50, 'At most 50 assigned occurrences.');
export type AssignmentResponseValue = z.infer<typeof assignmentResponseValueSchema>;
export type AssignmentResponses = z.infer<typeof assignmentResponsesSchema>;

/** Correctness only. Keys and explanations belong exclusively to authorized answer reveal. */
export const conceptualFeedbackSchema = z.strictObject({
  status: z.enum(['correct', 'incorrect', 'unanswered']),
});
export type ConceptualFeedback = z.infer<typeof conceptualFeedbackSchema>;
export const mixedGradedItemSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('truth_table'),
    itemId: z.uuid(),
    feedback: truthTableCheckResponseSchema,
  }),
  z.strictObject({
    type: z.literal('true_false'),
    itemId: z.uuid(),
    feedback: conceptualFeedbackSchema,
  }),
  z.strictObject({
    type: z.literal('multiple_choice'),
    itemId: z.uuid(),
    feedback: conceptualFeedbackSchema,
  }),
]);
export const mixedGradedSubmissionResultSchema = z.strictObject({
  gradingVersion: z.literal('mixed_v1'),
  items: z.array(mixedGradedItemSchema).max(50),
  summary: truthTableCheckResponseSchema.shape.summary,
});
export type MixedGradedSubmissionResult = z.infer<typeof mixedGradedSubmissionResultSchema>;

const responseCountsSchema = z.strictObject({
  completedResponses: z.number().int().nonnegative(),
  totalResponses: z.number().int().nonnegative(),
});
export const mixedCompletionSubmissionResultSchema = z.strictObject({
  gradingVersion: z.literal('mixed_completion_v1'),
  items: z
    .array(
      responseCountsSchema.extend({
        itemId: z.uuid(),
        type: z.enum(['truth_table', 'true_false', 'multiple_choice']),
      }),
    )
    .max(50),
  summary: responseCountsSchema,
});
export type MixedCompletionSubmissionResult = z.infer<typeof mixedCompletionSubmissionResultSchema>;
