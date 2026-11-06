import { z } from 'zod';
import { fitchProofSchema, proofCheckReportSchema } from './proof';

/** Only student-entered work. Statements, permissions, keys and reports are never accepted here. */
export const fitchDerivationAnswerSchema = z.strictObject({
  type: z.literal('derivation'),
  proof: fitchProofSchema,
});

export type FitchDerivationAnswer = z.infer<typeof fitchDerivationAnswerSchema>;

/** Staged request contracts; they do not widen active student-work admission. */
export const saveFitchAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: fitchDerivationAnswerSchema,
});

export type SaveFitchAnswers = z.infer<typeof saveFitchAnswersSchema>;

export const checkFitchAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: fitchDerivationAnswerSchema,
});

export type CheckFitchAnswers = z.infer<typeof checkFitchAnswersSchema>;

/** Retain the exact bounded report separately from awarded grading and the student's proof. */
export const derivationEvaluationEvidenceSchema = z.strictObject({
  evaluationVersion: z.literal('derivation_v1'),
  type: z.literal('derivation'),
  itemId: z.uuid(),
  problemVersionId: z.uuid(),
  report: proofCheckReportSchema,
});

export type DerivationEvaluationEvidence = z.infer<typeof derivationEvaluationEvidenceSchema>;

/** Student-specific diagnostics; no private reference or instructor explanation. */
export const derivationCheckFeedbackSchema = z.strictObject({
  type: z.literal('derivation'),
  report: proofCheckReportSchema,
});

export type DerivationCheckFeedback = z.infer<typeof derivationCheckFeedbackSchema>;
