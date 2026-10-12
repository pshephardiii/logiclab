export type BinaryOperator = 'and' | 'or' | 'implies';

/** Parentheses determine grouping but do not create separate AST nodes. */
export type Formula =
  | { readonly type: 'variable'; readonly name: string }
  | { readonly type: 'not'; readonly operand: Formula }
  | {
      readonly type: 'binary';
      readonly operator: BinaryOperator;
      readonly left: Formula;
      readonly right: Formula;
    };

export const FORMULA_LIMITS = Object.freeze({
  maxLength: 256,
  maxNesting: 32,
  maxVariables: 4,
});

export type FormulaErrorCode =
  | 'INVALID_CHARACTER'
  | 'EXPECTED_EXPRESSION'
  | 'EXPECTED_CLOSING_PAREN'
  | 'UNEXPECTED_TOKEN'
  | 'FORMULA_TOO_LONG'
  | 'NESTING_LIMIT'
  | 'VARIABLE_LIMIT';

/** Position is a zero-based UTF-16 offset; end-of-input uses source.length. */
export class FormulaParseError extends Error {
  readonly name = 'FormulaParseError';

  constructor(
    public readonly code: FormulaErrorCode,
    public readonly position: number,
    message: string,
  ) {
    super(`${message} (at character ${position + 1}).`);
  }
}

type TokenKind = 'variable' | 'not' | BinaryOperator | 'open' | 'close' | 'end';
type Token = { kind: TokenKind; text: string; position: number };

const symbols: Readonly<Record<string, TokenKind>> = {
  '¬': 'not', '!': 'not',
  '∧': 'and', '&': 'and',
  '∨': 'or', '|': 'or',
  '→': 'implies',
  '(': 'open', ')': 'close',
};

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  for (let position = 0; position < source.length;) {
    const text = source[position]!;
    if (/\s/u.test(text)) {
      position++;
      continue;
    }
    if (source.startsWith('->', position)) {
      tokens.push({ kind: 'implies', text: '->', position });
      position += 2;
      continue;
    }
    const kind = /^[A-Z]$/.test(text) ? 'variable' : symbols[text];
    if (!kind) {
      throw new FormulaParseError(
        'INVALID_CHARACTER', position,
        `Unexpected character ${JSON.stringify(text)}; use A–Z, ¬/!, ∧/&, ∨/|, →/->, or parentheses`,
      );
    }
    tokens.push({ kind, text, position });
    position++;
  }
  tokens.push({ kind: 'end', text: '', position: source.length });
  return tokens;
}

/**
 * Precedence: not > and > or > implies.
 * And/or associate left; implication associates right.
 * Whitespace is ignored between tokens (the alias -> must remain contiguous).
 */
export function parseFormula(source: string): Formula {
  if (source.length > FORMULA_LIMITS.maxLength) {
    throw new FormulaParseError(
      'FORMULA_TOO_LONG', FORMULA_LIMITS.maxLength,
      `Formula must be at most ${FORMULA_LIMITS.maxLength} characters`,
    );
  }

  const tokens = tokenize(source);
  const variables = new Set<string>();
  let cursor = 0;
  const current = (): Token => tokens[cursor]!;

  function checkDepth(depth: number): void {
    if (depth > FORMULA_LIMITS.maxNesting) {
      throw new FormulaParseError(
        'NESTING_LIMIT', current().position,
        `Formula exceeds ${FORMULA_LIMITS.maxNesting} nested groups, negations, or implications`,
      );
    }
  }

  function implication(depth: number): Formula {
    checkDepth(depth);
    const left = disjunction(depth);
    if (current().kind === 'implies') {
      cursor++;
      return { type: 'binary', operator: 'implies', left, right: implication(depth + 1) };
    }
    return left;
  }

  function disjunction(depth: number): Formula {
    let left = conjunction(depth);
    while (current().kind === 'or') {
      cursor++;
      left = { type: 'binary', operator: 'or', left, right: conjunction(depth) };
    }
    return left;
  }

  function conjunction(depth: number): Formula {
    let left = unary(depth);
    while (current().kind === 'and') {
      cursor++;
      left = { type: 'binary', operator: 'and', left, right: unary(depth) };
    }
    return left;
  }

  function unary(depth: number): Formula {
    checkDepth(depth);
    const token = current();
    if (token.kind === 'not') {
      cursor++;
      return { type: 'not', operand: unary(depth + 1) };
    }
    if (token.kind === 'open') {
      cursor++;
      const expression = implication(depth + 1);
      if (current().kind !== 'close') {
        throw new FormulaParseError(
          'EXPECTED_CLOSING_PAREN', current().position,
          `Expected ')' to close '(' at character ${token.position + 1}`,
        );
      }
      cursor++;
      return expression;
    }
    if (token.kind === 'variable') {
      variables.add(token.text);
      if (variables.size > FORMULA_LIMITS.maxVariables) {
        throw new FormulaParseError(
          'VARIABLE_LIMIT', token.position,
          `Use at most ${FORMULA_LIMITS.maxVariables} distinct variables`,
        );
      }
      cursor++;
      return { type: 'variable', name: token.text };
    }
    throw new FormulaParseError(
      'EXPECTED_EXPRESSION', token.position,
      'Expected a variable, negation, or parenthesized expression',
    );
  }

  const expression = implication(0);
  if (current().kind !== 'end') {
    throw new FormulaParseError(
      'UNEXPECTED_TOKEN', current().position,
      `Unexpected ${JSON.stringify(current().text)}; expected an operator or end of formula`,
    );
  }
  return expression;
}
