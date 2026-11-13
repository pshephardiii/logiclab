import { z } from 'zod';

/** Transport budgets; accepting this shape does not establish a well-formed or correct tree. */
export const TRUTH_TREE_LIMITS = Object.freeze({
  maxOccurrences: 200,
  maxBranches: 127,
  maxExpansions: 200,
  maxPremises: 50,
  maxFormulaLength: 256,
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
