import { FormulaParseError } from './errors';
import type { FormulaNode, BinaryOperator } from './types';
import type { FormulaSourceSpan, ParsedFormulaSyntax } from './syntax';

type SyntaxAtom = { readonly type: 'bottom' };

export const FORMULA_GROUPING_POLICY_VERSION = 1;

export type FormulaGroupingIssue = {
  readonly code: 'GROUPING_REQUIRED';
  readonly position: number;
  readonly span: FormulaSourceSpan;
  readonly parentOperator: BinaryOperator;
  readonly childOperator: BinaryOperator;
  readonly message: string;
};

const symbols = { and: '∧', or: '∨', implies: '→', iff: '↔' };

/** Inspect source-derived metadata; different binary operators need explicit boundaries. */
export function formulaGroupingIssues<Atom extends SyntaxAtom = never>(
  parsed: ParsedFormulaSyntax<Atom>,
): FormulaGroupingIssue[] {
  const issues: FormulaGroupingIssue[] = [];

  for (const [node] of parsed.nodes) {
    if (node.type !== 'binary') continue;

    for (const child of [node.left, node.right]) {
      if (child.type !== 'binary' || child.operator === node.operator) continue;

      const syntax = parsed.nodes.get(child)!;
      if (syntax.groups.length > 0) continue;

      issues.push({
        code: 'GROUPING_REQUIRED',
        position: syntax.operatorPosition!,
        span: syntax.span,
        parentOperator: node.operator,
        childOperator: child.operator,
        message: `Add parentheses or square brackets to show how ${symbols[child.operator]} groups with ${symbols[node.operator]}`,
      });
    }
  }

  // Parser construction order follows precedence, not necessarily source order.
  return issues.sort((left, right) => left.position - right.position);
}

/** Opt-in authoring policy; existing parsing/evaluation remains unchanged until callers select it. */
export function requireExplicitGrouping<Atom extends SyntaxAtom = never>(
  parsed: ParsedFormulaSyntax<Atom>,
): ParsedFormulaSyntax<Atom> {
  const issue = formulaGroupingIssues(parsed)[0];
  if (issue) throw new FormulaParseError(issue.code, issue.position, issue.message);

  return parsed;
}

/**
 * Ordered members of a positive conjunction/disjunction chain. Start inside the selected root's
 * own outer groups, but stop at explicit groups on its descendants and at different operators.
 * This identifies boundaries only; it grants no permission to apply a rule or omit an alternative.
 */
export function formulaChainMembers<Atom extends SyntaxAtom = never>(
  parsed: ParsedFormulaSyntax<Atom>,
  root: FormulaNode<Atom> = parsed.formula,
): readonly FormulaNode<Atom>[] {
  if (!parsed.nodes.has(root)) throw new Error('Select a node from this parsed formula.');
  if (root.type !== 'binary' || (root.operator !== 'and' && root.operator !== 'or')) return [root];

  const members: FormulaNode<Atom>[] = [];
  const pending = [root.right, root.left];

  // An explicit group is one member, even when its operator matches the surrounding chain.
  while (pending.length) {
    const node = pending.pop()!;
    if (
      node.type === 'binary' &&
      node.operator === root.operator &&
      parsed.nodes.get(node)!.groups.length === 0
    ) {
      pending.push(node.right, node.left);
    } else members.push(node);
  }

  return members;
}
