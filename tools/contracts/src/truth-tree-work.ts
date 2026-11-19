import { z } from 'zod';
import { truthTreeSchema, truthTreeCheckReportSchema } from './truth-tree';

/** Student-entered work only; pinned statements, references, reports and grades are server-owned. */
export const truthTreeAnswerSchema = z.strictObject({
  type: z.literal('truth_tree'),
  tree: truthTreeSchema,
});

export type TruthTreeAnswer = z.infer<typeof truthTreeAnswerSchema>;

/** Revisioned practice requests; assignment admission and finalization are enforced separately. */
export const saveTruthTreeAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: truthTreeAnswerSchema,
});

export type SaveTruthTreeAnswers = z.infer<typeof saveTruthTreeAnswersSchema>;

export const checkTruthTreeAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: truthTreeAnswerSchema,
});

export type CheckTruthTreeAnswers = z.infer<typeof checkTruthTreeAnswersSchema>;

/** Occurrence-specific evidence; finalization, awarded points and release remain separate. */
export const truthTreeEvaluationEvidenceSchema = z.strictObject({
  evaluationVersion: z.literal('truth_tree_v1'),
  type: z.literal('truth_tree'),
  itemId: z.uuid(),
  problemVersionId: z.uuid(),
  report: truthTreeCheckReportSchema,
});

export type TruthTreeEvaluationEvidence = z.infer<typeof truthTreeEvaluationEvidenceSchema>;

export const truthTreeCheckFeedbackSchema = z.strictObject({
  type: z.literal('truth_tree'),
  report: truthTreeCheckReportSchema,
});

export type TruthTreeCheckFeedback = z.infer<typeof truthTreeCheckFeedbackSchema>;

/** Completion is one finished response, with verification retained but no correctness score. */
export const truthTreeCompletionEvidenceSchema = truthTreeEvaluationEvidenceSchema.extend({
  completedResponses: z.literal(1),
  totalResponses: z.literal(1),
});

export type TruthTreeCompletionEvidence = z.infer<typeof truthTreeCompletionEvidenceSchema>;
