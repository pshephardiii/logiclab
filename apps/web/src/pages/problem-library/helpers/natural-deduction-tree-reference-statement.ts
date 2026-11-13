import type { NaturalDeductionTreeDerivationDefinition } from '@logiclab/contracts/natural-deduction-tree-derivation';
import { parseProofFormula, sameFormula } from '@logiclab/logic-engine/proof';

/** Available premises need not all occur in a tree. Check only its target and entered premise leaves. */
export function naturalDeductionTreeReferenceStatementMatches(
  definition: NaturalDeductionTreeDerivationDefinition,
): boolean {
  const proof = definition.referenceProof;
  if (!proof) return true;

  const root = proof.nodes.find((node) => node.id === proof.rootId);
  const premises = new Map(definition.premises.map((premise) => [premise.id, premise.formula]));
  try {
    if (
      !root ||
      !sameFormula(parseProofFormula(root.formula), parseProofFormula(definition.conclusion))
    )
      return false;

    for (const node of proof.nodes) {
      if (node.kind !== 'premise') continue;
      const formula = node.premiseId ? premises.get(node.premiseId) : undefined;
      if (
        formula === undefined ||
        !sameFormula(parseProofFormula(formula), parseProofFormula(node.formula))
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
