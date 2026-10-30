import { z } from 'zod';

/** Transport budgets, not a claim that a structurally bounded proof is valid. */
export const PROOF_LIMITS = Object.freeze({
  maxSteps: 200,
  maxBlocks: 64,
  maxBlockDepth: 16,
  maxPremises: 50,
  maxFormulaLength: 256,
  maxPermittedRules: 64,
  maxDiagnostics: 500,
  maxCheckWork: 500_000,
});

const id = z.uuid().transform((value) => value.toLowerCase());
const formula = z.string().max(PROOF_LIMITS.maxFormulaLength);
const ruleId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);
const scope = { id, blockId: id.nullable(), formula };

/** Blank fields are retained draft work; syntax and references are checked by the engine later. */
export const proofStepSchema = z.discriminatedUnion('kind', [
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
    lineReferences: z.array(id).max(2),
    subproofReferences: z.array(id).max(2),
  }),
]);
export type ProofStep = z.infer<typeof proofStepSchema>;

export const proofBlockSchema = z.strictObject({
  id,
  parentId: id.nullable(),
  assumptionId: id,
  endId: id.nullable(),
});

/** Flat tables encode nested Fitch scope without recursive untrusted JSON. */
export const fitchProofSchema = z.strictObject({
  proofVersion: z.literal(1),
  format: z.literal('fitch'),
  steps: z.array(proofStepSchema).max(PROOF_LIMITS.maxSteps),
  blocks: z.array(proofBlockSchema).max(PROOF_LIMITS.maxBlocks),
});
export type FitchProof = z.infer<typeof fitchProofSchema>;

export const proofProblemSchema = z.strictObject({
  ruleCatalogVersion: z.literal(1),
  premises: z.array(z.strictObject({ id, formula: formula.min(1) })).max(PROOF_LIMITS.maxPremises),
  conclusion: formula.min(1),
  permittedRuleIds: z.array(ruleId).max(PROOF_LIMITS.maxPermittedRules),
});
export type ProofProblem = z.infer<typeof proofProblemSchema>;

export const proofCheckInputSchema = z.strictObject({
  problem: proofProblemSchema,
  proof: fitchProofSchema,
});
export type ProofCheckInput = z.infer<typeof proofCheckInputSchema>;

const diagnosticCode = z.enum([
  'UNSUPPORTED_VERSION',
  'RESOURCE_LIMIT',
  'INVALID_STRUCTURE',
  'INVALID_FORMULA',
  'UNKNOWN_RULE',
  'RULE_DISABLED',
  'INVALID_REFERENCE',
  'RULE_MISMATCH',
  'INVALID_DEPENDENCY',
  'INCOMPLETE_PROOF',
  'TARGET_NOT_ESTABLISHED',
]);
export const proofDiagnosticSchema = z.strictObject({
  code: diagnosticCode,
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
    ruleCatalogVersion: z.literal(1),
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
