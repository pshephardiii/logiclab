import { FormulaParseError } from '../parser/errors';
import { parseTokens } from '../parser/parse-tokens';
import { tokenize } from '../parser/tokenizer';
import type { ProofFormula } from './types';

export const PROOF_FORMULA_LIMITS = Object.freeze({
  maxLength: 256,
  maxNesting: 32,
  maxVariables: 26,
});

/** Reuse the existing grammar with proof-only falsity atoms and variable bounds. */
export function parseProofFormula(source: string): ProofFormula {
  if (source.length > PROOF_FORMULA_LIMITS.maxLength) {
    throw new FormulaParseError(
      'FORMULA_TOO_LONG',
      PROOF_FORMULA_LIMITS.maxLength,
      `Formula must be at most ${PROOF_FORMULA_LIMITS.maxLength} characters`,
    );
  }
  return parseTokens<{ readonly type: 'bottom' }>(tokenize(source, true), {
    limits: PROOF_FORMULA_LIMITS,
    extraAtom: (token) => (token.kind === 'bottom' ? { type: 'bottom' } : undefined),
    expectedExpression: 'Expected a variable, contradiction, negation, or grouped expression',
  });
}
