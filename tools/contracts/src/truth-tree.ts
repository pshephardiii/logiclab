import { FORMULA_GROUPING_POLICY_VERSION } from './formula-policy-values';
import { z } from 'zod';
import {
  TRUTH_TREE_LIMITS,
  truthTreeIdSchema as id,
  truthTreeFormulaTextSchema as formula,
} from './truth-tree-fields';

export { TRUTH_TREE_LIMITS, TRUTH_TREE_RULE_IDS, truthTreeRuleIdSchema } from './truth-tree-fields';

export type { TruthTreeRuleId } from './truth-tree-fields';

export { truthTreeDiagnosticSchema, truthTreeDiagnosticCodeSchema } from './truth-tree-diagnostics';

export type { TruthTreeDiagnostic, TruthTreeDiagnosticCode } from './truth-tree-diagnostics';

export { truthTreeStepReportSchema } from './truth-tree-step-report';

export type { TruthTreeStepReport } from './truth-tree-step-report';

export {
  truthTreeBranchOutcomeSchema,
  truthTreeCounterexampleSchema,
  truthTreeCheckReportSchema,
} from './truth-tree-check-report';

export type {
  TruthTreeBranchOutcome,
  TruthTreeCounterexample,
  TruthTreeCheckReport,
} from './truth-tree-check-report';

/** Source identity is distinct from formula text, including repeated premises or occurrences. */
export const truthTreeOccurrenceSchema = z.strictObject({
  id,
  formula,
  origin: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('premise'), premiseId: id.nullable() }),
    z.strictObject({ kind: z.literal('negated_conclusion') }),
    z.strictObject({ kind: z.literal('expansion'), expansionId: id.nullable() }),
  ]),
});

export type TruthTreeOccurrence = z.infer<typeof truthTreeOccurrenceSchema>;

/** A closure claim still needs formula validation and same-path witness checking. */
export const truthTreeClosureSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('complement'), occurrenceIds: z.tuple([id, id]) }),
  z.strictObject({ kind: z.literal('falsity'), occurrenceId: id }),
]);

export type TruthTreeClosure = z.infer<typeof truthTreeClosureSchema>;

/** One ordered segment: child branches inherit ancestors, rather than copying their formulas. */
export const truthTreeBranchSchema = z.strictObject({
  id,
  parentId: id.nullable(),
  occurrenceIds: z.array(id).max(TRUTH_TREE_LIMITS.maxOccurrences),
  ending: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('open') }),
    z.strictObject({ kind: z.literal('closed'), closure: truthTreeClosureSchema.nullable() }),
    z.strictObject({
      kind: z.literal('split'),
      expansionId: id.nullable(),
      childBranchIds: z.array(id).max(2),
    }),
  ]),
});

export type TruthTreeBranch = z.infer<typeof truthTreeBranchSchema>;

/** Blank/unknown rule references survive drafts; the checker resolves them against its catalog. */
const ruleReference = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);

/** Groups identify generated occurrences, not formulas merely repeated elsewhere in the tree. */
export const truthTreeExpansionSchema = z.strictObject({
  id,
  branchId: id,
  sourceId: id.nullable(),
  ruleId: ruleReference.nullable(),
  resultGroups: z.array(z.strictObject({ branchId: id, occurrenceIds: z.array(id).max(2) })).max(2),
});

export type TruthTreeExpansion = z.infer<typeof truthTreeExpansionSchema>;

/** Flat bounded draft transport. Graph/reference correctness belongs to the deterministic checker. */
export const truthTreeSchema = z
  .strictObject({
    treeVersion: z.literal(1),
    format: z.literal('truth_tree'),
    rootBranchId: id.nullable(),
    occurrences: z.array(truthTreeOccurrenceSchema).max(TRUTH_TREE_LIMITS.maxOccurrences),
    branches: z.array(truthTreeBranchSchema).max(TRUTH_TREE_LIMITS.maxBranches),
    expansions: z.array(truthTreeExpansionSchema).max(TRUTH_TREE_LIMITS.maxExpansions),
  })
  .superRefine((tree, context) => {
    // Bound aggregate references too: per-branch limits alone permit quadratic payload growth.
    const membershipCount = tree.branches.reduce(
      (total, branch) => total + branch.occurrenceIds.length,
      0,
    );

    if (membershipCount > TRUTH_TREE_LIMITS.maxOccurrences) {
      context.addIssue({
        code: 'custom',
        path: ['branches'],
        message: 'Total branch occurrence references exceed the truth-tree limit.',
      });
    }
  });

export type TruthTree = z.infer<typeof truthTreeSchema>;

/** Authoritative argument only: the initial conclusion occurrence must contain its negation. */
export const truthTreeProblemSchema = z.strictObject({
  formulaGroupingVersion: z.literal(FORMULA_GROUPING_POLICY_VERSION).optional(),
  ruleCatalogVersion: z.literal(1),
  premises: z
    .array(z.strictObject({ id, formula: formula.min(1) }))
    .max(TRUTH_TREE_LIMITS.maxPremises),
  conclusion: formula.min(1),
});

export type TruthTreeProblem = z.infer<typeof truthTreeProblemSchema>;

/** Standalone checker input, not a route or permission to supply a replacement assigned problem. */
export const truthTreeCheckInputSchema = z.strictObject({
  problem: truthTreeProblemSchema,
  tree: truthTreeSchema,
});

export type TruthTreeCheckInput = z.infer<typeof truthTreeCheckInputSchema>;
