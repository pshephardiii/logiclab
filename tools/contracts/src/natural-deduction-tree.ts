import { z } from 'zod';
import {
  PROOF_LIMITS,
  proofReferenceIdSchema as id,
  proofFormulaTextSchema as formula,
  proofRuleIdSchema as ruleId,
} from './proof-fields';
import { proofProblemSchema } from './proof';

/** One supporting subtree and the assumption occurrences discharged from that branch only. */
export const naturalDeductionTreeProofBranchSchema = z.strictObject({
  rootId: id.nullable(),
  // Explicit even for vacuous discharge, where there are no occurrences to read it from.
  assumptionFormula: formula,
  assumptionIds: z.array(id).max(PROOF_LIMITS.maxSteps),
});

export type NaturalDeductionTreeProofBranch = z.infer<typeof naturalDeductionTreeProofBranchSchema>;

const fields = { id, formula };

/** References point toward supporting children, never toward a parent or a display position. */
export const naturalDeductionTreeProofNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...fields, kind: z.literal('premise'), premiseId: id.nullable() }),
  z.strictObject({ ...fields, kind: z.literal('assumption') }),
  z.strictObject({
    ...fields,
    kind: z.literal('inference'),
    ruleId: ruleId.nullable(),
    // Ordinary children correspond to the catalog's line-reference operands.
    lineReferences: z.array(id).max(2),
    // Discharged children correspond to the catalog's subproof operands.
    branches: z.array(naturalDeductionTreeProofBranchSchema).max(2),
  }),
]);

export type NaturalDeductionTreeProofNode = z.infer<typeof naturalDeductionTreeProofNodeSchema>;

/** Flat bounded draft data; uniqueness, connectivity, scope and logical validity need a checker. */
export const naturalDeductionTreeProofSchema = z.strictObject({
  proofVersion: z.literal(1),
  format: z.literal('tree'),
  rootId: id.nullable(),
  nodes: z.array(naturalDeductionTreeProofNodeSchema).max(PROOF_LIMITS.maxSteps),
});

export type NaturalDeductionTreeProof = z.infer<typeof naturalDeductionTreeProofSchema>;

/** Standalone transport only; this does not enable tree problems in live assignment workflows. */
export const naturalDeductionTreeProofCheckInputSchema = z.strictObject({
  problem: proofProblemSchema,
  proof: naturalDeductionTreeProofSchema,
});

export type NaturalDeductionTreeProofCheckInput = z.infer<
  typeof naturalDeductionTreeProofCheckInputSchema
>;
