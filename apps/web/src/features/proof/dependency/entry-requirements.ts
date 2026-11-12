import type { DependencyProof } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';

/** Check filled-in entry fields, leaving dependency correctness and rule validity to Check proof. */
export function dependencyEntryRequirement(
  proof: DependencyProof,
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

  const earlier = proof.steps.slice(0, index);
  const available = new Map(earlier.map((line) => [line.id, line]));
  if (step.lineReferences.some((id) => !available.has(id)))
    return 'Replace the unavailable line citation.';

  if (
    step.discharges.length !== rule.subproofReferences ||
    step.discharges.some((pair) => !pair.assumptionId || !pair.conclusionId)
  )
    return rule.subproofReferences
      ? `Complete ${rule.subproofReferences} discharge pair${rule.subproofReferences === 1 ? '' : 's'} for this rule.`
      : 'This rule does not discharge assumptions; remove the discharge pairs.';

  if (
    step.discharges.some(
      (pair) =>
        available.get(pair.assumptionId!)?.kind !== 'assumption' ||
        !available.has(pair.conclusionId!),
    )
  )
    return 'Choose an available assumption and concluding line for each discharge.';

  // An empty dependency set can be correct, especially after discharging all assumptions.
  return null;
}
