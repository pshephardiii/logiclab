import { parseProofFormula, PROOF_FORMULA_LIMITS } from '../proof/parse-formula';
import type { TruthTreeFormula } from './types';

export const TRUTH_TREE_FORMULA_LIMITS = PROOF_FORMULA_LIMITS;

/** Share bounded propositional syntax (including falsity), not natural-deduction rules. */
export function parseTruthTreeFormula(source: string): TruthTreeFormula {
  return parseProofFormula(source);
}
