import { FormulaParseError } from './errors';
import { FORMULA_LIMITS } from './limits';
import type { FormulaNode, Token } from './types';

type ParseOptions<Atom> = {
  limits: { maxNesting: number; maxVariables: number };
  extraAtom: (token: Token) => Atom | undefined;
  expectedExpression: string;
};

/** Recursive-descent parsing: each precedence level consumes the tighter level. */
export function parseTokens<Atom = never>(
  tokens: readonly Token[],
  options?: ParseOptions<Atom>,
): FormulaNode<Atom> {
  const limits = options?.limits ?? FORMULA_LIMITS;
  const variables = new Set<string>();
  let cursor = 0;
  const current = (): Token => tokens[cursor]!;

  function checkDepth(depth: number): void {
    if (depth > limits.maxNesting) {
      throw new FormulaParseError(
        'NESTING_LIMIT',
        current().position,
        `Formula exceeds ${limits.maxNesting} nested groups, negations, or implications`,
      );
    }
  }

  function parseBiconditional(depth: number): FormulaNode<Atom> {
    const left = parseImplication(depth);
    if (current().kind !== 'iff') return left;
    cursor++;
    const right = parseImplication(depth);
    if (current().kind === 'iff') {
      throw new FormulaParseError(
        'UNEXPECTED_TOKEN',
        current().position,
        'Group repeated biconditionals explicitly, for example (P ↔ Q) ↔ R or P ↔ (Q ↔ R)',
      );
    }
    return { type: 'binary', operator: 'iff', left, right };
  }

  function parseImplication(depth: number): FormulaNode<Atom> {
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

  function parseDisjunction(depth: number): FormulaNode<Atom> {
    // Repeatedly replacing the left side makes disjunction left-associative.
    let left = parseConjunction(depth);
    while (current().kind === 'or') {
      cursor++;
      left = { type: 'binary', operator: 'or', left, right: parseConjunction(depth) };
    }
    return left;
  }

  function parseConjunction(depth: number): FormulaNode<Atom> {
    // Conjunction binds more tightly than disjunction, and associates left.
    let left = parseUnary(depth);
    while (current().kind === 'and') {
      cursor++;
      left = { type: 'binary', operator: 'and', left, right: parseUnary(depth) };
    }
    return left;
  }

  function parseUnary(depth: number): FormulaNode<Atom> {
    checkDepth(depth);
    const token = current();
    if (token.kind === 'not') {
      cursor++;
      return { type: 'not', operand: parseUnary(depth + 1) };
    }
    if (token.kind === 'open') return parseGroup(depth, token);
    if (token.kind === 'variable') return parseVariable(token);
    const atom = options?.extraAtom(token);
    if (atom !== undefined) {
      cursor++;
      return atom;
    }
    throw new FormulaParseError(
      'EXPECTED_EXPRESSION',
      token.position,
      options?.expectedExpression ?? 'Expected a variable, negation, or grouped expression',
    );
  }

  function parseGroup(depth: number, openingToken: Token): FormulaNode<Atom> {
    cursor++;
    const expression = parseBiconditional(depth + 1);
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

  function parseVariable(token: Token): FormulaNode<Atom> {
    variables.add(token.text);
    if (variables.size > limits.maxVariables) {
      throw new FormulaParseError(
        'VARIABLE_LIMIT',
        token.position,
        `Use at most ${limits.maxVariables} distinct variables`,
      );
    }
    cursor++;
    return { type: 'variable', name: token.text };
  }

  const expression = parseBiconditional(0);
  if (current().kind !== 'end') {
    throw new FormulaParseError(
      'UNEXPECTED_TOKEN',
      current().position,
      `Unexpected ${JSON.stringify(current().text)}; expected an operator or end of formula`,
    );
  }
  return expression;
}
