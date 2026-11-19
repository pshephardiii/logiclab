import { ProblemType } from './problem-type';
import { z } from 'zod';
import { conceptualAnswerSchema } from './conceptual-question';
import { truthTableAnswerSchema, truthTableCheckResponseSchema } from './truth-table';

/** Stored per occurrence: preserve legacy table arrays and use tagged conceptual responses. */
export const objectiveAssignmentResponseValueSchema = z.union([
  z.array(truthTableAnswerSchema).max(4096),
  conceptualAnswerSchema,
]);

export const objectiveAssignmentResponsesSchema = z
  .record(z.uuid(), objectiveAssignmentResponseValueSchema)
  .refine((responses) => Object.keys(responses).length <= 50, 'At most 50 assigned occurrences.');

export type ObjectiveAssignmentResponseValue = z.infer<
  typeof objectiveAssignmentResponseValueSchema
>;

export type ObjectiveAssignmentResponses = z.infer<typeof objectiveAssignmentResponsesSchema>;

/** Correctness only. Keys and explanations belong exclusively to authorized answer reveal. */
export const conceptualFeedbackSchema = z.strictObject({
  status: z.enum(['correct', 'incorrect', 'unanswered']),
});

export type ConceptualFeedback = z.infer<typeof conceptualFeedbackSchema>;

export const objectiveGradedItemSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal(ProblemType.TruthTable),
    itemId: z.uuid(),
    feedback: truthTableCheckResponseSchema,
  }),
  z.strictObject({
    type: z.literal(ProblemType.TrueFalse),
    itemId: z.uuid(),
    feedback: conceptualFeedbackSchema,
  }),
  z.strictObject({
    type: z.literal(ProblemType.MultipleChoice),
    itemId: z.uuid(),
    feedback: conceptualFeedbackSchema,
  }),
]);

export const objectiveGradedSubmissionResultSchema = z.strictObject({
  gradingVersion: z.literal('mixed_v1'),
  items: z.array(objectiveGradedItemSchema).max(50),
  summary: truthTableCheckResponseSchema.shape.summary,
});

export type ObjectiveGradedItem = z.infer<typeof objectiveGradedItemSchema>;

export type ObjectiveGradedSubmissionResult = z.infer<typeof objectiveGradedSubmissionResultSchema>;

const responseCountsSchema = z.strictObject({
  completedResponses: z.number().int().nonnegative(),
  totalResponses: z.number().int().nonnegative(),
});

export const objectiveCompletionSubmissionResultSchema = z.strictObject({
  gradingVersion: z.literal('mixed_completion_v1'),
  items: z
    .array(
      responseCountsSchema.extend({
        itemId: z.uuid(),
        type: z.enum([ProblemType.TruthTable, ProblemType.TrueFalse, ProblemType.MultipleChoice]),
      }),
    )
    .max(50),
  summary: responseCountsSchema,
});

export type ObjectiveCompletionSubmissionResult = z.infer<
  typeof objectiveCompletionSubmissionResultSchema
>;
