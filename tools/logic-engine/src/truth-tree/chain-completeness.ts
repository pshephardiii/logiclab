import { formulaChainMembers, requireExplicitGrouping } from '../parser/grouping';
import { FormulaParseError } from '../parser/errors';
import { parseTruthTreeFormulaWithSyntax } from './parse-formula';
import type { StepContext } from './step-formulas';

/** Filled choices, not rule correctness. Wrong result values remain review evidence after submission. */
export function filledChainChoices(context: StepContext) {
  const matches = new Map<string, { memberCount: number; coveredMemberIndices: number[] }>();
  for (const expansion of context.structure.expansions.values()) {
    context.budget.spend();
    const chain = expansion.ruleId === 'conjunct_extraction' || expansion.ruleId === 'disjunction';
    if (!chain) {
      if (expansion.chainChoice) return null;
      continue;
    }
    const choice = expansion.chainChoice;
    if (!choice || choice.ruleId !== expansion.ruleId) return null;
    const source =
      context.authoritativeSources.get(expansion.sourceId!) ??
      context.structure.occurrences.get(expansion.sourceId!)!.formula;
    context.budget.spend(source.length + 1);
    let count: number;
    try {
      const parsed = requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(source));
      context.budget.spend(parsed.nodes.size);
      count = formulaChainMembers(parsed).length;
    } catch (error) {
      if (!(error instanceof FormulaParseError)) throw error;
      return null;
    }
    if (choice.ruleId === 'conjunct_extraction') {
      if (choice.memberIndex >= count) return null;
      matches.set(expansion.id, { memberCount: count, coveredMemberIndices: [choice.memberIndex] });
    } else if (choice.splitIndex >= count) return null;
  }
  return matches;
}
