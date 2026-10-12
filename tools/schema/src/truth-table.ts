import { z } from 'zod';

export const truthTableRequestSchema = z.strictObject({ formula: z.string().min(1).max(256) });
export const truthTableAnswerSchema = z.strictObject({
  rowId: z.string().min(1).max(128),
  columnId: z.string().min(1).max(1024),
  value: z.boolean().nullable(),
});
export const truthTableCheckRequestSchema = truthTableRequestSchema.extend({
  answers: z.array(truthTableAnswerSchema).max(4096),
});
const columnSchema = z.strictObject({
  id: z.string(), label: z.string(), kind: z.enum(['given', 'answer']), isFinal: z.boolean(),
});
const rowSchema = z.strictObject({ id: z.string(), values: z.record(z.string(), z.boolean()) });
// Exercise values contain only given columns; solution values contain every column.
export const truthTableExerciseResponseSchema = z.strictObject({
  variables: z.array(z.string()), columns: z.array(columnSchema), rows: z.array(rowSchema),
});
export const truthTableSolutionResponseSchema = truthTableExerciseResponseSchema;
export const truthTableCheckResponseSchema = z.strictObject({
  cells: z.array(z.strictObject({
    rowId: z.string(), columnId: z.string(), status: z.enum(['correct', 'incorrect', 'unanswered']),
  })),
  summary: z.strictObject({ correct: z.number().int().nonnegative(), incorrect: z.number().int().nonnegative(), unanswered: z.number().int().nonnegative(), total: z.number().int().nonnegative() }),
});
export const truthTableErrorResponseSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string(), position: z.number().int().nonnegative().optional() }),
});
export type TruthTableRequest = z.infer<typeof truthTableRequestSchema>;
export type TruthTableCheckRequest = z.infer<typeof truthTableCheckRequestSchema>;
export type TruthTableExerciseResponse = z.infer<typeof truthTableExerciseResponseSchema>;
export type TruthTableSolutionResponse = z.infer<typeof truthTableSolutionResponseSchema>;
export type TruthTableCheckResponse = z.infer<typeof truthTableCheckResponseSchema>;
export type TruthTableErrorResponse = z.infer<typeof truthTableErrorResponseSchema>;
