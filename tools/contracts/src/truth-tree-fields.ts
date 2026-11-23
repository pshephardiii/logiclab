import { z } from 'zod';

/** Payload/checking budgets; accepting transport does not establish a well-formed or correct tree. */
export const TRUTH_TREE_LIMITS = Object.freeze({
  maxOccurrences: 200,
  maxBranches: 127,
  maxExpansions: 200,
  maxPremises: 50,
  maxFormulaLength: 256,
  maxBranchDepth: 32,
  maxDiagnostics: 200,
  maxCheckWork: 100_000,
});

export const truthTreeIdSchema = z.uuid().transform((value) => value.toLowerCase());

export const truthTreeFormulaTextSchema = z.string().max(TRUTH_TREE_LIMITS.maxFormulaLength);

export const TRUTH_TREE_RULE_IDS = [
  'double_negation',
  'conjunction',
  'negated_conjunction',
  'disjunction',
  'negated_disjunction',
  'conditional',
  'negated_conditional',
  'biconditional',
  'negated_biconditional',
] as const;

export const truthTreeRuleIdSchema = z.enum(TRUTH_TREE_RULE_IDS);

export type TruthTreeRuleId = z.infer<typeof truthTreeRuleIdSchema>;

/** Chain decomposition is opt-in; catalog 1 retains its original binary patterns. */
export const TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION = 2;

export const truthTreeChainChoiceSchema = z.discriminatedUnion('ruleId', [
  z.strictObject({
    ruleId: z.literal('conjunct_extraction'),
    memberIndex: z.number().int().min(0).max(TRUTH_TREE_LIMITS.maxFormulaLength),
  }),
  z.strictObject({
    ruleId: z.literal('disjunction'),
    splitIndex: z.number().int().min(1).max(TRUTH_TREE_LIMITS.maxFormulaLength),
  }),
]);

export type TruthTreeChainChoice = z.infer<typeof truthTreeChainChoiceSchema>;
