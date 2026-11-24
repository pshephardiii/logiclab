import { FORMULA_GROUPING_POLICY_VERSION } from './formula-policy-values';
import { ProblemType } from './problem-type';
import { z } from 'zod';
import { proofProblemSchema, PROOF_LIMITS } from './proof';

export const DERIVATION_AUTHORING_LIMITS = Object.freeze({ ruleLabel: 80, explanation: 5000 });

const id = z.uuid().transform((value) => value.toLowerCase());

const formula = z.string().max(PROOF_LIMITS.maxFormulaLength);

export const derivationExplanationSchema = z
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

export function derivationGroupingIssues(
  value: {
    ruleCatalogVersion: 1 | 2;
    formulaGroupingVersion?: 1;
  },
  context: z.RefinementCtx,
) {
  if (
    value.ruleCatalogVersion === 2 &&
    value.formulaGroupingVersion !== FORMULA_GROUPING_POLICY_VERSION
  )
    context.addIssue({
      code: 'custom',
      path: ['formulaGroupingVersion'],
      message: 'Catalog 2 requires explicit formula grouping policy 1.',
    });
}

export function derivationReferenceVersionIssues(
  value: {
    ruleCatalogVersion: 1 | 2;
    referenceProof: { proofVersion: 1 | 2 } | null;
  },
  context: z.RefinementCtx,
) {
  if (value.referenceProof && value.referenceProof.proofVersion !== value.ruleCatalogVersion)
    context.addIssue({
      code: 'custom',
      path: ['referenceProof', 'proofVersion'],
      message: 'The reference proof must use the statement’s rule catalog.',
    });
}

/** Shared fields, including staged formats; each consumer must narrow its format explicitly. */
export const derivationStatementSchema = z
  .strictObject({
    type: z.literal(ProblemType.Derivation),
    definitionVersion: z.literal(1),
    format: z.enum(['fitch', 'dependency', 'tree']),
    ruleCatalogVersion: z.union([z.literal(1), z.literal(2)]),
    formulaGroupingVersion: z.literal(FORMULA_GROUPING_POLICY_VERSION).optional(),
    checkerVersion: z.literal(1),
    premises: z.array(z.strictObject({ id, formula })).max(PROOF_LIMITS.maxPremises),
    conclusion: formula,
    rules: z.array(derivationRuleSchema).max(PROOF_LIMITS.maxPermittedRules),
  })
  .superRefine((value, context) => {
    derivationGroupingIssues(value, context);
    if (value.format === 'tree' && value.ruleCatalogVersion !== 1)
      context.addIssue({
        code: 'custom',
        path: ['ruleCatalogVersion'],
        message: 'Natural-deduction trees retain catalog 1.',
      });

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
