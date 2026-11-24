import type { ParsedFormulaSyntax } from '../parser/syntax';
import { FormulaParseError } from '../parser/errors';
import { mergeFormulaGrouping } from '../formula/grouping-source';
import { TRUTH_TREE_LIMITS } from '@logiclab/contracts/truth-tree';
import { TruthTreeResourceLimit, type TruthTreeBudget } from './structure-context';

type Syntax = ParsedFormulaSyntax<{ readonly type: 'bottom' }>;

/** Keep the shared boundary merge inside the truth-tree resource/error contract. */
export function chainContinuationSource(
  expected: Syntax,
  actual: Syntax,
  budget: TruthTreeBudget,
): string {
  try {
    return mergeFormulaGrouping(expected, actual, budget, TRUTH_TREE_LIMITS.maxFormulaLength);
  } catch (error) {
    if (!(error instanceof FormulaParseError) || error.code !== 'FORMULA_TOO_LONG') throw error;
    throw new TruthTreeResourceLimit(
      'Preserving the inherited grouping exceeds the formula limit.',
    );
  }
}
