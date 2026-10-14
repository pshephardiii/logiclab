import { z } from 'zod';

// Reusable field and data shapes.
const formulaSchema = z.string().min(1).max(256);

export const truthTableAnswerSchema = z.strictObject({
  rowId: z.string().min(1).max(128),
  columnId: z.string().min(1).max(1024),
  value: z.boolean().nullable(),
});
export type TruthTableAnswer = z.infer<typeof truthTableAnswerSchema>;

const truthTableColumnSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['given', 'answer']),
  isFinal: z.boolean(),
});

const truthTableRowSchema = z.strictObject({
  id: z.string(),
  values: z.record(z.string(), z.boolean()),
});

const cellFeedbackSchema = z.strictObject({
  rowId: z.string(),
  columnId: z.string(),
  status: z.enum(['correct', 'incorrect', 'unanswered']),
});

const checkSummarySchema = z.strictObject({
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  unanswered: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

const truthTableErrorSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
  position: z.number().int().nonnegative().optional(),
});

// Request contracts.
export const truthTableRequestSchema = z.strictObject({
  formula: formulaSchema,
});
export type TruthTableRequest = z.infer<typeof truthTableRequestSchema>;

export const truthTableCheckRequestSchema = truthTableRequestSchema.extend({
  answers: z.array(truthTableAnswerSchema).max(4096),
});
export type TruthTableCheckRequest = z.infer<typeof truthTableCheckRequestSchema>;

// Response contracts.
// Exercise values contain only given columns; solution values contain every column.
export const truthTableExerciseResponseSchema = z.strictObject({
  variables: z.array(z.string()),
  columns: z.array(truthTableColumnSchema),
  rows: z.array(truthTableRowSchema),
});
export type TruthTableExerciseResponse = z.infer<typeof truthTableExerciseResponseSchema>;

export const truthTableSolutionResponseSchema = truthTableExerciseResponseSchema;
export type TruthTableSolutionResponse = z.infer<typeof truthTableSolutionResponseSchema>;

export const truthTableCheckResponseSchema = z.strictObject({
  cells: z.array(cellFeedbackSchema),
  summary: checkSummarySchema,
});
export type TruthTableCheckResponse = z.infer<typeof truthTableCheckResponseSchema>;

export const truthTableErrorResponseSchema = z.strictObject({
  error: truthTableErrorSchema,
});
export type TruthTableErrorResponse = z.infer<typeof truthTableErrorResponseSchema>;
