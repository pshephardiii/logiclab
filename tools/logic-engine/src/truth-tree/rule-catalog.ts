/** Exact unsigned classical decomposition variants; independent of deduction rule permissions. */
export const TRUTH_TREE_RULE_CATALOG_VERSION = 1;

const definitions = [
  { id: 'double_negation', label: 'Double negation', branching: false },
  { id: 'conjunction', label: 'Conjunction', branching: false },
  { id: 'negated_conjunction', label: 'Negated conjunction', branching: true },
  { id: 'disjunction', label: 'Disjunction', branching: true },
  { id: 'negated_disjunction', label: 'Negated disjunction', branching: false },
  { id: 'conditional', label: 'Conditional', branching: true },
  { id: 'negated_conditional', label: 'Negated conditional', branching: false },
  { id: 'biconditional', label: 'Biconditional', branching: true },
  { id: 'negated_biconditional', label: 'Negated biconditional', branching: true },
] as const;

export type TruthTreeRuleId = (typeof definitions)[number]['id'];

export const TRUTH_TREE_RULE_CATALOG = Object.freeze(
  definitions.map((definition) => Object.freeze(definition)),
);
