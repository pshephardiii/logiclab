import { FormulaParseError } from './errors';
import { FORMULA_LIMITS } from './limits';
import type { Formula, Token } from './types';

/** Recursive-descent parsing: each precedence level consumes the tighter level. */
export function parseTokens(tokens: readonly Token[]): Formula {
  const variables = new Set<string>();
  let cursor = 0;
  const current = (): Token => tokens[cursor]!;

  function checkDepth(depth: number): void {
    if (depth > FORMULA_LIMITS.maxNesting) {
      throw new FormulaParseError(
        'NESTING_LIMIT',
        current().position,
        `Formula exceeds ${FORMULA_LIMITS.maxNesting} nested groups, negations, or implications`,
      );
    }
  }

  function parseImplication(depth: number): Formula {
    checkDepth(depth);
    const left = parseDisjunction(depth);
    if (current().kind === 'implies') {
      cursor++;
      // Recursive right-hand parsing makes implication right-associative.
      const right = parseImplication(depth + 1);
      return { type: 'binary', operator: 'implies', left, right };
    }
    return left;
  }

  function parseDisjunction(depth: number): Formula {
    // Repeatedly replacing the left side makes disjunction left-associative.
    let left = parseConjunction(depth);
    while (current().kind === 'or') {
      cursor++;
      left = { type: 'binary', operator: 'or', left, right: parseConjunction(depth) };
    }
    return left;
  }

  function parseConjunction(depth: number): Formula {
    // Conjunction binds more tightly than disjunction, and associates left.
    let left = parseUnary(depth);
    while (current().kind === 'and') {
      cursor++;
      left = { type: 'binary', operator: 'and', left, right: parseUnary(depth) };
    }
    return left;
  }

  function parseUnary(depth: number): Formula {
    checkDepth(depth);
    const token = current();
    if (token.kind === 'not') {
      cursor++;
      return { type: 'not', operand: parseUnary(depth + 1) };
    }
    if (token.kind === 'open') return parseGroup(depth, token);
    if (token.kind === 'variable') return parseVariable(token);
    throw new FormulaParseError(
      'EXPECTED_EXPRESSION',
      token.position,
      'Expected a variable, negation, or grouped expression',
    );
  }

  function parseGroup(depth: number, openingToken: Token): Formula {
    cursor++;
    const expression = parseImplication(depth + 1);
    const closingSymbol = openingToken.text === '[' ? ']' : ')';
    if (current().kind !== 'close' || current().text !== closingSymbol) {
      throw new FormulaParseError(
        openingToken.text === '[' ? 'EXPECTED_CLOSING_BRACKET' : 'EXPECTED_CLOSING_PAREN',
        current().position,
        `Expected '${closingSymbol}' to close '${openingToken.text}' at character ${openingToken.position + 1}`,
      );
    }
    cursor++;
    return expression;
  }

  function parseVariable(token: Token): Formula {
    variables.add(token.text);
    if (variables.size > FORMULA_LIMITS.maxVariables) {
      throw new FormulaParseError(
        'VARIABLE_LIMIT',
        token.position,
        `Use at most ${FORMULA_LIMITS.maxVariables} distinct variables`,
      );
    }
    cursor++;
    return { type: 'variable', name: token.text };
  }

  const expression = parseImplication(0);
  if (current().kind !== 'end') {
    throw new FormulaParseError(
      'UNEXPECTED_TOKEN',
      current().position,
      `Unexpected ${JSON.stringify(current().text)}; expected an operator or end of formula`,
    );
  }
  return expression;
}
