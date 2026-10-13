import type { Formula } from '../../parser';
import type { TruthTableColumn } from '../types';
import { canonicalExpression } from './expressions';

export function createColumns(
  variables: readonly string[],
  expressions: ReadonlyMap<string, Formula>,
  finalExpressionId: string,
): TruthTableColumn[] {
  const givenColumns = variables.map((name): TruthTableColumn => ({
    id: variableColumnId(name),
    label: name,
    kind: 'given',
    isFinal: false,
  }));

  const answerColumns = Array.from(expressions, ([id, formula]): TruthTableColumn => ({
    id,
    label: canonicalExpression(formula),
    kind: 'answer',
    isFinal: id === finalExpressionId,
  }));

  return [...givenColumns, ...answerColumns];
}

// Given-column IDs are independent of source notation.
export function variableColumnId(name: string): string {
  return `var:v1:${name}`;
}
