import type { FormulaNode } from '../parser/types';
import type { TruthTreeRuleId } from './rule-catalog';

/** Unsigned formulas: every formula on a branch is asserted true. */
export type TruthTreeFormula = FormulaNode<{ readonly type: 'bottom' }>;

/** Alternatives split branches; formulas inside each alternative stay together. */
export type TruthTreeFormulaExpansion = {
  kind: 'expansion';
  ruleId: TruthTreeRuleId;
  branches:
    | readonly [readonly TruthTreeFormula[]]
    | readonly [readonly TruthTreeFormula[], readonly TruthTreeFormula[]];
};

export type TruthTreeDecomposition =
  TruthTreeFormulaExpansion | { kind: 'literal' } | { kind: 'constant'; value: boolean };
