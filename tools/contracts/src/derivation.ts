import { z } from 'zod';
import { fitchProofSchema, proofCheckReportSchema } from './proof';

import {
  derivationStatementSchema,
  derivationExplanationSchema as explanation,
} from './derivation-statement';

export {
  DERIVATION_AUTHORING_LIMITS,
  derivationRuleSchema,
  normalizedRuleLabel,
} from './derivation-statement';

/** Fitch-only public shape; other formats use separately staged authoring contracts. */
export const derivationContentSchema = derivationStatementSchema.safeExtend({
  format: z.literal('fitch'),
});

export type DerivationContent = z.infer<typeof derivationContentSchema>;

/** Instructor-only authored JSON; a reference/version tag is not a cached acceptance claim. */
export const derivationDefinitionSchema = derivationContentSchema.safeExtend({
  referenceProof: fitchProofSchema.nullable(),
  explanation,
});

export type DerivationDefinition = z.infer<typeof derivationDefinitionSchema>;

/** Privileged answer-reveal payload; never include this in ordinary assigned content. */
export const derivationSolutionSchema = z.strictObject({
  type: z.literal('derivation'),
  definitionVersion: z.literal(1),
  format: z.literal('fitch'),
  ruleCatalogVersion: z.literal(1),
  checkerVersion: z.literal(1),
  referenceProof: fitchProofSchema,
  explanation,
});

export type DerivationSolution = z.infer<typeof derivationSolutionSchema>;

export const derivationReferenceCheckResponseSchema = z.strictObject({
  problemId: z.uuid(),
  updatedAt: z.iso.datetime(),
  check: z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('missing') }),
    z.strictObject({ status: z.literal('checked'), report: proofCheckReportSchema }),
  ]),
});

export type DerivationReferenceCheckResponse = z.infer<
  typeof derivationReferenceCheckResponseSchema
>;
