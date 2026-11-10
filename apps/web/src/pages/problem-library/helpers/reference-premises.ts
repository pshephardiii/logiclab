import { parseProofFormula, sameFormula } from '@logiclab/logic-engine/proof';
import type { DependencyDerivationDefinition } from '@logiclab/contracts/dependency-derivation';

/** Compare statement sources only; this does not check inferences or repair an existing proof. */
export function referencePremisesMatch(definition: DependencyDerivationDefinition): boolean {
  if (!definition.referenceProof) return true;
  const premises = new Map(definition.premises.map((premise) => [premise.id, premise.formula]));
  const seen = new Set<string>();
  try {
    for (const step of definition.referenceProof.steps) {
      if (step.kind !== 'premise') continue;
      const formula = step.premiseId ? premises.get(step.premiseId) : undefined;
      if (
        formula === undefined ||
        !sameFormula(parseProofFormula(formula), parseProofFormula(step.formula))
      )
        return false;
      seen.add(step.premiseId!);
    }
    return definition.premises.every((premise) => seen.has(premise.id));
  } catch {
    return false;
  }
}
