import { z } from 'zod';
import {
  PROOF_LIMITS,
  proofReferenceIdSchema as id,
  proofFormulaTextSchema as formula,
  proofRuleIdSchema as ruleId,
} from './proof-fields';
import { proofProblemSchema } from './proof';

/** A discharge cites a temporary assumption and an earlier concluding line, not a Fitch block. */
export const dependencyDischargeSchema = z.strictObject({
  assumptionId: id.nullable(),
  conclusionId: id.nullable(),
});
export type DependencyDischarge = z.infer<typeof dependencyDischargeSchema>;

const fields = {
  id,
  formula,
  // References are stable source-line IDs, never display numbers or formulas.
  dependencies: z.array(id).max(PROOF_LIMITS.maxSteps),
};

/** Incomplete and erroneous annotations remain saveable; transport shape is not proof acceptance. */
export const dependencyProofStepSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...fields, kind: z.literal('premise'), premiseId: id.nullable() }),
  z.strictObject({ ...fields, kind: z.literal('assumption') }),
  z.strictObject({
    ...fields,
    kind: z.literal('inference'),
    ruleId: ruleId.nullable(),
    lineReferences: z.array(id).max(2),
    discharges: z.array(dependencyDischargeSchema).max(2),
  }),
]);
export type DependencyProofStep = z.infer<typeof dependencyProofStepSchema>;

/** Flat dependency proofs have no implicit box scope or global assumption-closing operation. */
export const dependencyProofSchema = z.strictObject({
  proofVersion: z.literal(1),
  format: z.literal('dependency'),
  steps: z.array(dependencyProofStepSchema).max(PROOF_LIMITS.maxSteps),
});
export type DependencyProof = z.infer<typeof dependencyProofSchema>;

/** Format-specific checker input; callers enforce workflow admission and authoritative statements. */
export const dependencyProofCheckInputSchema = z.strictObject({
  problem: proofProblemSchema,
  proof: dependencyProofSchema,
});
export type DependencyProofCheckInput = z.infer<typeof dependencyProofCheckInputSchema>;
