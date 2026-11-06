import { z } from 'zod';
import { fitchProofSchema, proofCheckReportSchema } from './proof';

/** Only student-entered work. Statements, permissions, keys and reports are never accepted here. */
export const derivationAnswerSchema = z.strictObject({
  type: z.literal('derivation'),
  proof: fitchProofSchema,
});

export type DerivationAnswer = z.infer<typeof derivationAnswerSchema>;

/** Staged request contracts; they do not widen active student-work admission. */
export const saveDerivationAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: derivationAnswerSchema,
});

export type SaveDerivationAnswers = z.infer<typeof saveDerivationAnswersSchema>;

export const checkDerivationAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: derivationAnswerSchema,
});

export type CheckDerivationAnswers = z.infer<typeof checkDerivationAnswersSchema>;

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
