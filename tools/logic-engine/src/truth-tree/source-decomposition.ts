import { requireExplicitGrouping } from '../parser/grouping';
import { parseTruthTreeFormulaWithSyntax } from './parse-formula';
import { decomposeTruthTreeFormula } from './decompose-formula';
import type { TruthTreeFormula } from './types';
import type { TruthTreeBudget } from './structure-context';

/** Binary rules retain their original patterns while carrying source groups into their results. */
export function truthTreeSourceDecomposition(source: string, budget: TruthTreeBudget) {
  budget.spend(source.length + 1);
  const syntax = requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(source));
  budget.spend(syntax.nodes.size);
  const pattern = decomposeTruthTreeFormula(syntax.formula);
  if (pattern.kind !== 'expansion') return null;

  const text = (node: TruthTreeFormula) => {
    const location = syntax.nodes.get(node)!;
    const span = location.groups.at(-1) ?? location.span;
    return source.slice(span.start, span.end);
  };
  const negated = (node: TruthTreeFormula) => {
    const grouped = syntax.nodes.get(node)!.groups.length > 0;
    return node.type === 'binary' && !grouped ? `¬(${text(node)})` : `¬${text(node)}`;
  };
  const root = syntax.formula;
  if (root.type === 'not') {
    const operand = root.operand;
    if (operand.type === 'not')
      return { ruleId: pattern.ruleId, branches: [[text(operand.operand)]] };
    if (operand.type !== 'binary') return null;
    const { left, right } = operand;
    switch (operand.operator) {
      case 'and':
        return { ruleId: pattern.ruleId, branches: [[negated(left)], [negated(right)]] };
      case 'or':
        return { ruleId: pattern.ruleId, branches: [[negated(left), negated(right)]] };
      case 'implies':
        return { ruleId: pattern.ruleId, branches: [[text(left), negated(right)]] };
      case 'iff':
        return {
          ruleId: pattern.ruleId,
          branches: [
            [text(left), negated(right)],
            [negated(left), text(right)],
          ],
        };
    }
  }
  if (root.type !== 'binary') return null;
  const { left, right } = root;
  switch (root.operator) {
    case 'and':
      return { ruleId: pattern.ruleId, branches: [[text(left), text(right)]] };
    case 'or':
      return { ruleId: pattern.ruleId, branches: [[text(left)], [text(right)]] };
    case 'implies':
      return { ruleId: pattern.ruleId, branches: [[negated(left)], [text(right)]] };
    case 'iff':
      return {
        ruleId: pattern.ruleId,
        branches: [
          [text(left), text(right)],
          [negated(left), negated(right)],
        ],
      };
  }
}
