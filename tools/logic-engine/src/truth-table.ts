import { evaluateFormula } from './evaluator';
import { parseFormula } from './parser';
import type { Formula } from './parser';

export type TruthTableColumn = {
  readonly id: string;
  readonly label: string;
  readonly kind: 'given' | 'answer';
  readonly isFinal: boolean;
};

export type TruthTableRow = {
  readonly id: string;
  readonly values: Readonly<Record<string, boolean>>;
};

/** Includes expected answers; callers must apply disclosure policy before sending to students. */
export type TruthTable = {
  readonly variables: readonly string[];
  readonly columns: readonly TruthTableColumn[];
  readonly rows: readonly TruthTableRow[];
};

const operatorSymbols = { and: '∧', or: '∨', implies: '→' } as const;

/** Fully grouped binary expressions preserve structure, independent of source notation. */
function canonicalExpression(formula: Formula): string {
  switch (formula.type) {
    case 'variable': return formula.name;
    case 'not': return `¬${canonicalExpression(formula.operand)}`;
    case 'binary':
      return `(${canonicalExpression(formula.left)} ${operatorSymbols[formula.operator]} ${canonicalExpression(formula.right)})`;
  }
}

/** Generate a bounded table from input, with alphabetical variables and T-first rows. */
export function generateTruthTable(source: string): TruthTable {
  const formula = parseFormula(source);
  const variableNames = new Set<string>();
  const expressions = new Map<string, Formula>();
  const expressionId = (node: Formula): string => `expr:v1:${canonicalExpression(node)}`;

  function visit(node: Formula): void {
    switch (node.type) {
      case 'variable': variableNames.add(node.name); return;
      case 'not': visit(node.operand); break;
      case 'binary': visit(node.left); visit(node.right); break;
    }
    // Postorder inserts children before parents; identical structures share a column.
    expressions.set(expressionId(node), node);
  }
  visit(formula);
  const finalId = expressionId(formula);
  // A single-variable exercise still has an answer column distinct from its given column.
  expressions.set(finalId, formula);
  const variables = [...variableNames].sort();
  const columns: TruthTableColumn[] = [
    ...variables.map(name => ({ id: `var:v1:${name}`, label: name, kind: 'given' as const, isFinal: false })),
    ...[...expressions].map(([id, node]) => ({
      id, label: canonicalExpression(node), kind: 'answer' as const, isFinal: id === finalId,
    })),
  ];

  const rows: TruthTableRow[] = [];
  for (let rowIndex = 0; rowIndex < 2 ** variables.length; rowIndex++) {
    const assignment: Record<string, boolean> = {};
    const values: Record<string, boolean> = {};
    variables.forEach((name, index) => {
      // First variable changes slowest; zero bits represent T so all-T comes first.
      const value = (rowIndex & (1 << (variables.length - index - 1))) === 0;
      assignment[name] = value;
      values[`var:v1:${name}`] = value;
    });
    for (const [id, node] of expressions) {
      values[id] = evaluateFormula(node, assignment);
    }
    rows.push({
      id: `row:v1:${variables.map(name => `${name}=${assignment[name] ? 'T' : 'F'}`).join(';')}`,
      values,
    });
  }
  return { variables, columns, rows };
}
