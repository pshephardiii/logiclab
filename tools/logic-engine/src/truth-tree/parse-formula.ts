import { FORMULA_GROUPING_POLICY_VERSION } from '@logiclab/contracts/formula-policy-values';
import {
  parseProofFormula,
  parseProofFormulaWithPolicy,
  parseProofFormulaWithSyntax,
  PROOF_FORMULA_LIMITS,
} from '../proof/parse-formula';
import type { TruthTreeFormula } from './types';

export const TRUTH_TREE_FORMULA_LIMITS = PROOF_FORMULA_LIMITS;

/** Share bounded propositional syntax (including falsity), not natural-deduction rules. */
export function parseTruthTreeFormula(source: string): TruthTreeFormula {
  return parseProofFormula(source);
}

export function parseTruthTreeFormulaWithPolicy(
  source: string,
  formulaGroupingVersion?: typeof FORMULA_GROUPING_POLICY_VERSION,
): TruthTreeFormula {
  return parseProofFormulaWithPolicy(source, formulaGroupingVersion);
}

/** Truth trees share the proof formula syntax, including explicit source grouping. */
export const parseTruthTreeFormulaWithSyntax = parseProofFormulaWithSyntax;
