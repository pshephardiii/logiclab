import { FormulaParseError } from './errors';
import { FORMULA_LIMITS } from './limits';
import { tokenize } from './tokenizer';
import { parseTokens } from './parse-tokens';
import type { Formula } from './types';
import type { FormulaNodeSyntax, ParsedFormulaSyntax } from './syntax';

/**
 * Precedence: not > and > or > implies > iff.
 * And/or associate left; implication associates right. Repeated biconditionals require grouping.
 * Whitespace is ignored between tokens (the aliases -> and <-> must remain contiguous).
 */
export function parseFormula(source: string): Formula {
  checkLength(source);
  return parseTokens(tokenize(source));
}

/** Capture explicit grouping without changing the existing semantic tree or validation policy. */
export function parseFormulaWithSyntax(source: string): ParsedFormulaSyntax {
  checkLength(source);
  const nodes = new Map<Formula, FormulaNodeSyntax>();
  const formula = parseTokens(tokenize(source), undefined, nodes);
  return { source, formula, nodes };
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
