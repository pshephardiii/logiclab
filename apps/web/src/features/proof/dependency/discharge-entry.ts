import type { DependencyProof } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { insertDependencyStep } from './editor';

/** Prepare editing defaults without inferring a conclusion, support or logical validity. */
export function createDependencyDischargeEntry(
  proof: DependencyProof,
  rules: { id: string; label: string }[],
  assumptionId: string,
): { base: DependencyProof; draft: DependencyProof; index: number } | null {
  const rule =
    rules.find((rule) => rule.id === 'implication_introduction') ??
    rules.find((rule) => getPropositionalRule(rule.id)?.subproofReferences);

  if (!rule) return null;

  const index = proof.steps.length;
  const draft = insertDependencyStep(proof, index, 'inference');
  const closing = draft.steps[index]!;

  if (closing.kind !== 'inference') return null;

  // Prefill only the explicit assumption reference. The student supplies the conclusion,
  // ending line and remaining dependencies; no validity or support is inferred here.
  draft.steps[index] = {
    ...closing,
    ruleId: rule.id,
    discharges: [{ assumptionId, conclusionId: null }],
  };

  return { base: proof, draft, index };
}
