import type { ParsedFormulaSyntax } from '../parser/syntax';
import type { FormulaNode } from '../parser/types';
import { FormulaParseError } from '../parser/errors';

type Node = FormulaNode<{ readonly type: 'bottom' }>;
type Syntax = ParsedFormulaSyntax<{ readonly type: 'bottom' }>;

/** Merge boundaries only after structural equality has established corresponding semantic nodes. */
export function mergeFormulaGrouping(
  expected: Syntax,
  actual: Syntax,
  budget: { spend(units: number): void },
  maxLength: number,
): string {
  const pending: [Node, Node][] = [[expected.formula, actual.formula]];
  const opens = new Map<number, number>();
  const closes = new Map<number, number>();

  while (pending.length) {
    budget.spend(1);
    const [source, result] = pending.pop()!;
    const required = expected.nodes.get(source)!;
    const entered = actual.nodes.get(result)!;

    // A root's own outer parentheses do not constrain decomposition inside that root.
    // Preserve entered groups, and restore any omitted boundary on an inherited descendant.
    if (
      source !== expected.formula &&
      source.type === 'binary' &&
      required.groups.length &&
      !entered.groups.length
    ) {
      opens.set(entered.span.start, (opens.get(entered.span.start) ?? 0) + 1);
      closes.set(entered.span.end, (closes.get(entered.span.end) ?? 0) + 1);
    }

    if (source.type === 'binary' && result.type === 'binary')
      pending.push([source.left, result.left], [source.right, result.right]);
    else if (source.type === 'not' && result.type === 'not')
      pending.push([source.operand, result.operand]);
  }

  const length =
    actual.source.length + [...opens.values()].reduce((sum, count) => sum + count * 2, 0);
  if (length > maxLength)
    throw new FormulaParseError(
      'FORMULA_TOO_LONG',
      maxLength,
      'Preserving the inherited grouping exceeds the formula limit',
    );

  budget.spend(length + 1);
  let text = '';
  for (let position = 0; position <= actual.source.length; position++)
    text +=
      ')'.repeat(closes.get(position) ?? 0) +
      '('.repeat(opens.get(position) ?? 0) +
      (actual.source[position] ?? '');

  return text;
}
