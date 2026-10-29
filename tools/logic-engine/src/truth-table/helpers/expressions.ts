import type { Formula } from '../../parser/types';

/** Collect distinct expressions in child-before-parent order. */
export function collectTableExpressions(formula: Formula) {
  const variableNames = new Set<string>();
  const expressions = new Map<string, Formula>();

  function visit(node: Formula): void {
    switch (node.type) {
      case 'variable':
        variableNames.add(node.name);
        return;
      case 'not':
        visit(node.operand);
        break;
      case 'binary':
        visit(node.left);
        visit(node.right);
        break;
    }

    // Postorder inserts children before parents; identical structures share a column.
    expressions.set(expressionColumnId(node), node);
  }

  visit(formula);
  // A single-variable exercise still needs an answer distinct from its given column.
  expressions.set(expressionColumnId(formula), formula);

  return {
    variables: [...variableNames].sort(),
    expressions,
  };
}

export function expressionColumnId(formula: Formula): string {
  return `expr:v1:${canonicalExpression(formula)}`;
}

const operatorSymbols = { and: '∧', or: '∨', implies: '→', iff: '↔' } as const;

/** Fully grouped binary expressions preserve structure, independent of source notation. */
export function canonicalExpression(formula: Formula): string {
  switch (formula.type) {
    case 'variable':
      return formula.name;
    case 'not':
      return `¬${canonicalExpression(formula.operand)}`;
    case 'binary': {
      const left = canonicalExpression(formula.left);
      const right = canonicalExpression(formula.right);
      const operator = operatorSymbols[formula.operator];
      return `(${left} ${operator} ${right})`;
    }
  }
}
