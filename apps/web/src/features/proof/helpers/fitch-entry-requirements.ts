import type { FitchProof } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';

/** Entry completeness only: formulas and rule applications are checked on explicit Check proof. */
export function fitchEntryRequirement(
  proof: FitchProof,
  index: number,
  rules: { id: string }[],
): string | null {
  const step = proof.steps[index];
  if (!step || !step.formula.trim()) return 'Enter a formula.';
  if (step.kind !== 'inference') return null;

  const rule =
    step.ruleId && rules.some((value) => value.id === step.ruleId)
      ? getPropositionalRule(step.ruleId)
      : undefined;
  if (!rule) return 'Choose a rule.';

  if (step.lineReferences.length !== rule.lineReferences || step.lineReferences.some((id) => !id))
    return rule.lineReferences
      ? `Select exactly ${rule.lineReferences} line citation${rule.lineReferences === 1 ? '' : 's'} for this rule.`
      : 'This rule does not use line citations; clear them.';

  const earlier = new Set(proof.steps.slice(0, index).map((line) => line.id));
  if (step.lineReferences.some((id) => !earlier.has(id)))
    return 'Replace the unavailable line citation.';

  if (
    step.subproofReferences.length !== rule.subproofReferences ||
    step.subproofReferences.some((id) => !id)
  )
    return rule.subproofReferences
      ? `Select exactly ${rule.subproofReferences} subproof citation${rule.subproofReferences === 1 ? '' : 's'} for this rule.`
      : 'This rule does not use subproof citations; clear them.';

  const blocks = new Set(proof.blocks.map((block) => block.id));
  if (step.subproofReferences.some((id) => !blocks.has(id)))
    return 'Replace the unavailable subproof citation.';
  return null;
}
