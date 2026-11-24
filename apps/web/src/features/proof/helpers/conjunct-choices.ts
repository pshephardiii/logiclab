import { formulaChainMembers, requireExplicitGrouping } from '@logiclab/logic-engine';
import { parseProofFormulaWithSyntax } from '@logiclab/logic-engine/proof';
import { proofNotation } from './proof-notation';

/** Omit the field entirely: catalog 1 rejects even an undefined selection property. */
export function withoutConjunctSelection<T extends { conjunctIndex?: number | null }>(step: T): T {
  const next = { ...step };
  delete next.conjunctIndex;
  return next;
}

/** Describe source positions only; the student still enters the result and explicitly checks it. */
export function proofConjunctChoices(source: string | undefined) {
  if (!source) return [];
  try {
    const parsed = requireExplicitGrouping(parseProofFormulaWithSyntax(source));
    if (parsed.formula.type !== 'binary' || parsed.formula.operator !== 'and') return [];

    return formulaChainMembers(parsed).map((node, index) => {
      const syntax = parsed.nodes.get(node)!;
      const span = syntax.groups.at(-1) ?? syntax.span;
      return {
        id: String(index),
        label: `${index + 1}. ${proofNotation(source.slice(span.start, span.end))}`,
      };
    });
  } catch {
    return [];
  }
}

export function proofConjunctRequirement(
  step: { ruleId: string | null; conjunctIndex?: number | null; lineReferences: string[] },
  sources?: ReadonlyMap<string, string>,
): string | null {
  if (step.ruleId !== 'and_chain_elimination')
    return step.conjunctIndex !== undefined ? 'Clear the conjunct selection for this rule.' : null;

  const choices = proofConjunctChoices(sources?.get(step.lineReferences[0] ?? ''));
  return Number.isInteger(step.conjunctIndex) &&
    choices.some((choice) => choice.id === String(step.conjunctIndex))
    ? null
    : 'Choose an available conjunct from the cited line.';
}
