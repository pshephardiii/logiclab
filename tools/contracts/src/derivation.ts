import { z } from 'zod';
import {
  fitchProofSchema,
  proofProblemSchema,
  proofCheckReportSchema,
  PROOF_LIMITS,
} from './proof';

export const DERIVATION_AUTHORING_LIMITS = Object.freeze({ ruleLabel: 80, explanation: 5000 });
const id = z.uuid().transform((value) => value.toLowerCase());
const formula = z.string().max(PROOF_LIMITS.maxFormulaLength);
const explanation = z
  .string()
  .trim()
  .max(DERIVATION_AUTHORING_LIMITS.explanation)
  .nullable()
  .optional();

/** Comparison only: preserve the instructor's display spelling apart from outer whitespace. */
export function normalizedRuleLabel(label: string): string {
  return label.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
}

export const derivationRuleSchema = z.strictObject({
  id: proofProblemSchema.shape.permittedRuleIds.element,
  label: z
    .string()
    .trim()
    .min(1)
    .max(DERIVATION_AUTHORING_LIMITS.ruleLabel)
    .refine(
      (value) => !/[\p{Cc}\p{Cf}]/u.test(value),
      'Rule labels must not contain control or invisible formatting characters.',
    ),
});

/** Standalone staged statement shape; it does not enable the active exercise-definition union. */
export const derivationContentSchema = z
  .strictObject({
    type: z.literal('derivation'),
    definitionVersion: z.literal(1),
    format: z.literal('fitch'),
    ruleCatalogVersion: z.literal(1),
    checkerVersion: z.literal(1),
    premises: z.array(z.strictObject({ id, formula })).max(PROOF_LIMITS.maxPremises),
    conclusion: formula,
    rules: z.array(derivationRuleSchema).max(PROOF_LIMITS.maxPermittedRules),
  })
  .superRefine((value, context) => {
    const premises = new Set<string>();
    value.premises.forEach((premise, index) => {
      if (premises.has(premise.id))
        context.addIssue({
          code: 'custom',
          path: ['premises', index, 'id'],
          message: 'Premise IDs must be unique.',
        });
      premises.add(premise.id);
    });
    const rules = new Set<string>();
    const labels = new Set<string>();
    value.rules.forEach((rule, index) => {
      if (rules.has(rule.id))
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'id'],
          message: 'Enabled rule IDs must be unique.',
        });
      const label = normalizedRuleLabel(rule.label);
      if (labels.has(label))
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'label'],
          message: 'Enabled rules must have distinct normalized labels.',
        });
      rules.add(rule.id);
      labels.add(label);
    });
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
