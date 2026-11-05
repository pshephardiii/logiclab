import { z } from 'zod';
import {
  PROOF_LIMITS,
  proofReferenceIdSchema as id,
  proofFormulaTextSchema as formula,
  proofRuleIdSchema as ruleId,
} from './proof-fields';
import { proofProblemSchema } from './proof';

/** One supporting subtree and the assumption occurrences discharged from that branch only. */
export const treeProofBranchSchema = z.strictObject({
  rootId: id.nullable(),
  // Explicit even for vacuous discharge, where there are no occurrences to read it from.
  assumptionFormula: formula,
  assumptionIds: z.array(id).max(PROOF_LIMITS.maxSteps),
});
export type TreeProofBranch = z.infer<typeof treeProofBranchSchema>;

const fields = { id, formula };

/** References point toward supporting children, never toward a parent or a display position. */
export const treeProofNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...fields, kind: z.literal('premise'), premiseId: id.nullable() }),
  z.strictObject({ ...fields, kind: z.literal('assumption') }),
  z.strictObject({
    ...fields,
    kind: z.literal('inference'),
    ruleId: ruleId.nullable(),
    // Ordinary children correspond to the catalog's line-reference operands.
    lineReferences: z.array(id).max(2),
    // Discharged children correspond to the catalog's subproof operands.
    branches: z.array(treeProofBranchSchema).max(2),
  }),
]);
export type TreeProofNode = z.infer<typeof treeProofNodeSchema>;

/** Flat bounded draft data; uniqueness, connectivity, scope and logical validity need a checker. */
export const treeProofSchema = z.strictObject({
  proofVersion: z.literal(1),
  format: z.literal('tree'),
  rootId: id.nullable(),
  nodes: z.array(treeProofNodeSchema).max(PROOF_LIMITS.maxSteps),
});
export type TreeProof = z.infer<typeof treeProofSchema>;

/** Standalone transport only; this does not enable tree problems in live assignment workflows. */
export const treeProofCheckInputSchema = z.strictObject({
  problem: proofProblemSchema,
  proof: treeProofSchema,
});
export type TreeProofCheckInput = z.infer<typeof treeProofCheckInputSchema>;
