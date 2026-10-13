import { parseFormula } from '../parser/index';
import type { TruthTable } from './types';
import { collectTableExpressions, expressionColumnId, createColumns, createRows } from './helpers';

/** Generate a bounded table from input, with alphabetical variables and T-first rows. */
export function generateTruthTable(source: string): TruthTable {
  const formula = parseFormula(source);
  const { variables, expressions } = collectTableExpressions(formula);

  return {
    variables,
    columns: createColumns(variables, expressions, expressionColumnId(formula)),
    rows: createRows(variables, expressions),
  };
}
