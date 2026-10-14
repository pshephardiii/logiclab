import { FormulaParseError } from './errors';
import { FORMULA_LIMITS } from './limits';
import { tokenize } from './tokenizer';
import { parseTokens } from './parse-tokens';
import type { Formula } from './types';

/**
 * Precedence: not > and > or > implies.
 * And/or associate left; implication associates right.
 * Whitespace is ignored between tokens (the alias -> must remain contiguous).
 */
export function parseFormula(source: string): Formula {
  checkLength(source);
  return parseTokens(tokenize(source));
}

function checkLength(source: string): void {
  if (source.length > FORMULA_LIMITS.maxLength) {
    throw new FormulaParseError(
      'FORMULA_TOO_LONG',
      FORMULA_LIMITS.maxLength,
      `Formula must be at most ${FORMULA_LIMITS.maxLength} characters`,
    );
  }
}
