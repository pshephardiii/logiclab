import { formulaChainMembers, requireExplicitGrouping } from '@logiclab/logic-engine';
import { parseTruthTreeFormulaWithSyntax } from '@logiclab/logic-engine/truth-tree';
import type { TruthTreeChainChoice } from '@logiclab/contracts/truth-tree';
import { formulaNotation } from '../../../components/formula/formula-notation';

/** Choices describe the source, not whether entered results are correct. Explicit groups stay whole. */
export function truthTreeChainChoices(source: string, ruleId: string) {
  try {
    const parsed = requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(source));
    const operator =
      ruleId === 'conjunct_extraction' ? 'and' : ruleId === 'disjunction' ? 'or' : null;
    if (parsed.formula.type !== 'binary' || parsed.formula.operator !== operator) return [];

    const members = formulaChainMembers(parsed).map((node) => {
      const syntax = parsed.nodes.get(node)!;
      const span = syntax.groups.at(-1) ?? syntax.span;
      return formulaNotation(source.slice(span.start, span.end));
    });
    return ruleId === 'conjunct_extraction'
      ? members.map((text, memberIndex) => ({
          value: memberIndex,
          label: `${memberIndex + 1}. ${text}`,
          choice: { ruleId: 'conjunct_extraction', memberIndex } satisfies TruthTreeChainChoice,
        }))
      : members.slice(1).map((_, index) => ({
          value: index + 1,
          label: `${members.slice(0, index + 1).join(' ∨ ')} │ ${members.slice(index + 1).join(' ∨ ')}`,
          choice: { ruleId: 'disjunction', splitIndex: index + 1 } satisfies TruthTreeChainChoice,
        }));
  } catch {
    return [];
  }
}

/** A chain selection describes required construction fields, never result correctness. */
export function truthTreeChainSelection({
  source,
  ruleId,
  version,
  choice,
}: {
  source: string;
  ruleId: string;
  version: 1 | 2;
  choice?: TruthTreeChainChoice;
}) {
  if (version !== 2 || (ruleId !== 'conjunct_extraction' && ruleId !== 'disjunction')) return null;

  const choices = truthTreeChainChoices(source, ruleId);
  const selected =
    choice?.ruleId === 'conjunct_extraction' ? choice.memberIndex : choice?.splitIndex;
  const filled = choices.some(
    (option) => option.value === selected && option.choice.ruleId === choice?.ruleId,
  );
  return { ruleId, choices, selected, filled };
}
