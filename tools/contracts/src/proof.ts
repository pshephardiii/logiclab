import { FORMULA_GROUPING_POLICY_VERSION } from './formula-policy-values';
import { z } from 'zod';
import { CheckerDiagnosticCode } from './checker-diagnostic-code';

import {
  PROOF_LIMITS,
  proofReferenceIdSchema as id,
  proofFormulaTextSchema as formula,
  proofRuleIdSchema as ruleId,
  proofConjunctIndexSchema,
} from './proof-fields';

export { PROOF_LIMITS } from './proof-fields';

const scope = { id, blockId: id.nullable(), formula };

/** Blank fields are retained draft work; syntax and references are checked by the engine later. */
export const fitchProofStepSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...scope,
    kind: z.literal('premise'),
    blockId: z.null(),
    premiseId: id.nullable(),
  }),
  z.strictObject({ ...scope, kind: z.literal('assumption'), blockId: id }),
  z.strictObject({
    ...scope,
    kind: z.literal('inference'),
    ruleId: ruleId.nullable(),
    conjunctIndex: proofConjunctIndexSchema,
    lineReferences: z.array(id).max(2),
    subproofReferences: z.array(id).max(2),
  }),
]);

export type FitchProofStep = z.infer<typeof fitchProofStepSchema>;

export const fitchProofBlockSchema = z.strictObject({
  id,
  parentId: id.nullable(),
  assumptionId: id,
  endId: id.nullable(),
});

/** Flat tables encode nested Fitch scope without recursive untrusted JSON. */
export const fitchProofSchema = z
  .strictObject({
    proofVersion: z.union([z.literal(1), z.literal(2)]),
    format: z.literal('fitch'),
    steps: z.array(fitchProofStepSchema).max(PROOF_LIMITS.maxSteps),
    blocks: z.array(fitchProofBlockSchema).max(PROOF_LIMITS.maxBlocks),
  })
  .superRefine((proof, context) => {
    if (proof.proofVersion === 1 && proof.steps.some((step) => 'conjunctIndex' in step))
      context.addIssue({
        code: 'custom',
        message: 'Catalog-1 proofs cannot include a conjunct selection.',
      });
  });

/** Keep live owner/student work guarded until source-aware authoring/editors are integrated. */
export const fitchApplicationProofSchema = fitchProofSchema.refine(
  (proof) => proof.proofVersion === 1,
  'Catalog-2 proofs are not enabled in application workflows yet.',
);

export type FitchProof = z.infer<typeof fitchProofSchema>;

export const proofProblemSchema = z
  .strictObject({
    formulaGroupingVersion: z.literal(FORMULA_GROUPING_POLICY_VERSION).optional(),
    ruleCatalogVersion: z.union([z.literal(1), z.literal(2)]),
    premises: z
      .array(z.strictObject({ id, formula: formula.min(1) }))
      .max(PROOF_LIMITS.maxPremises),
    conclusion: formula.min(1),
    permittedRuleIds: z.array(ruleId).max(PROOF_LIMITS.maxPermittedRules),
  })
  .superRefine((problem, context) => {
    if (
      problem.ruleCatalogVersion === 2 &&
      problem.formulaGroupingVersion !== FORMULA_GROUPING_POLICY_VERSION
    )
      context.addIssue({
        code: 'custom',
        message: 'Catalog 2 requires explicit formula grouping policy 1.',
      });
  });

export type ProofProblem = z.infer<typeof proofProblemSchema>;

export const fitchProofCheckInputSchema = z
  .strictObject({
    problem: proofProblemSchema,
    proof: fitchProofSchema,
  })
  .refine(
    (input) => input.problem.ruleCatalogVersion === input.proof.proofVersion,
    'Proof and problem catalog versions must agree.',
  );

export type FitchProofCheckInput = z.infer<typeof fitchProofCheckInputSchema>;

export const proofDiagnosticCodeSchema = z.enum([
  CheckerDiagnosticCode.UnsupportedVersion,
  CheckerDiagnosticCode.ResourceLimit,
  CheckerDiagnosticCode.InvalidStructure,
  CheckerDiagnosticCode.InvalidFormula,
  CheckerDiagnosticCode.UnknownRule,
  CheckerDiagnosticCode.RuleDisabled,
  CheckerDiagnosticCode.InvalidReference,
  CheckerDiagnosticCode.RuleMismatch,
  CheckerDiagnosticCode.InvalidDependency,
  CheckerDiagnosticCode.IncompleteProof,
  CheckerDiagnosticCode.TargetNotEstablished,
]);

export type ProofDiagnosticCode = z.infer<typeof proofDiagnosticCodeSchema>;

export const proofDiagnosticSchema = z.strictObject({
  code: proofDiagnosticCodeSchema,
  message: z.string().min(1).max(500),
  stepIndex: z
    .number()
    .int()
    .min(0)
    .max(PROOF_LIMITS.maxSteps - 1)
    .optional(),
  blockId: id.optional(),
  position: z.number().int().min(0).max(PROOF_LIMITS.maxFormulaLength).optional(),
});

export type ProofDiagnostic = z.infer<typeof proofDiagnosticSchema>;

export const proofCheckReportSchema = z
  .strictObject({
    checkerVersion: z.literal(1),
    ruleCatalogVersion: z.union([z.literal(1), z.literal(2)]),
    status: z.enum(['accepted', 'needs_review', 'unassessable']),
    target: z.enum(['established', 'not_established', 'unknown']),
    steps: z
      .array(
        z.strictObject({
          stepId: id,
          stepIndex: z
            .number()
            .int()
            .min(0)
            .max(PROOF_LIMITS.maxSteps - 1),
          localStatus: z.enum(['valid', 'invalid', 'unassessable']),
          dependencyStatus: z.enum(['valid', 'invalid', 'unknown']),
        }),
      )
      .max(PROOF_LIMITS.maxSteps),
    diagnostics: z.array(proofDiagnosticSchema).max(PROOF_LIMITS.maxDiagnostics),
  })
  .superRefine((report, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });

    if (new Set(report.steps.map((step) => step.stepIndex)).size !== report.steps.length)
      reject('Each submitted step index needs a distinct report entry.');

    if (
      report.status === 'accepted' &&
      (report.target !== 'established' ||
        report.steps.length === 0 ||
        report.diagnostics.length > 0 ||
        new Set(report.steps.map((step) => step.stepId)).size !== report.steps.length ||
        report.steps.some(
          (step, index) =>
            step.stepIndex !== index ||
            step.localStatus !== 'valid' ||
            step.dependencyStatus !== 'valid',
        ))
    )
      reject('Accepted proofs require an established target and wholly valid, resolved work.');

    if (report.status === 'unassessable' && report.diagnostics.length === 0)
      reject('Unassessable proofs must explain why checking could not finish.');
  });

export type ProofCheckReport = z.infer<typeof proofCheckReportSchema>;
