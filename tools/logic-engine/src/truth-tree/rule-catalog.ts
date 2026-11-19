import type { TruthTreeRuleId } from '@logiclab/contracts/truth-tree';

export type { TruthTreeRuleId } from '@logiclab/contracts/truth-tree';

/** Exact unsigned classical decomposition variants; independent of deduction rule permissions. */
export const TRUTH_TREE_RULE_CATALOG_VERSION = 1;

const definitions = [
  { id: 'double_negation', label: 'Double negation', branching: false, resultFormulaCounts: [1] },
  { id: 'conjunction', label: 'Conjunction', branching: false, resultFormulaCounts: [2] },
  {
    id: 'negated_conjunction',
    label: 'Negated conjunction',
    branching: true,
    resultFormulaCounts: [1, 1],
  },
  { id: 'disjunction', label: 'Disjunction', branching: true, resultFormulaCounts: [1, 1] },
  {
    id: 'negated_disjunction',
    label: 'Negated disjunction',
    branching: false,
    resultFormulaCounts: [2],
  },
  { id: 'conditional', label: 'Conditional', branching: true, resultFormulaCounts: [1, 1] },
  {
    id: 'negated_conditional',
    label: 'Negated conditional',
    branching: false,
    resultFormulaCounts: [2],
  },
  { id: 'biconditional', label: 'Biconditional', branching: true, resultFormulaCounts: [2, 2] },
  {
    id: 'negated_biconditional',
    label: 'Negated biconditional',
    branching: true,
    resultFormulaCounts: [2, 2],
  },
] as const satisfies readonly {
  id: TruthTreeRuleId;
  label: string;
  branching: boolean;
  resultFormulaCounts: readonly number[];
}[];

export const TRUTH_TREE_RULE_CATALOG = Object.freeze(
  definitions.map((definition) =>
    Object.freeze({
      ...definition,
      resultFormulaCounts: Object.freeze(definition.resultFormulaCounts),
    }),
  ),
);
