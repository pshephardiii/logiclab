import { evaluateFormula } from '../../evaluator';
import type { Formula } from '../../parser';
import type { TruthTableRow } from '../types';
import { variableColumnId } from './columns';

export function createRows(
  variables: readonly string[],
  expressions: ReadonlyMap<string, Formula>,
): TruthTableRow[] {
  const rows: TruthTableRow[] = [];
  const rowCount = 2 ** variables.length;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    rows.push(createRow(rowIndex, variables, expressions));
  }

  return rows;
}

function createRow(
  rowIndex: number,
  variables: readonly string[],
  expressions: ReadonlyMap<string, Formula>,
): TruthTableRow {
  const assignment: Record<string, boolean> = {};
  const values: Record<string, boolean> = {};

  variables.forEach((name, variableIndex) => {
    const value = variableValueForRow(rowIndex, variableIndex, variables.length);
    assignment[name] = value;
    values[variableColumnId(name)] = value;
  });

  for (const [id, formula] of expressions) {
    values[id] = evaluateFormula(formula, assignment);
  }

  return {
    id: rowId(variables, assignment),
    values,
  };
}

function variableValueForRow(rowIndex: number, variableIndex: number, variableCount: number): boolean {
  // First variable changes slowest. Zero bits represent T, so all-T comes first.
  const bitPosition = variableCount - variableIndex - 1;
  const bitIsSet = (rowIndex & (1 << bitPosition)) !== 0;
  return !bitIsSet;
}

function rowId(variables: readonly string[], assignment: Readonly<Record<string, boolean>>): string {
  const entries = variables.map(name => `${name}=${assignment[name] ? 'T' : 'F'}`);
  return `row:v1:${entries.join(';')}`;
}
