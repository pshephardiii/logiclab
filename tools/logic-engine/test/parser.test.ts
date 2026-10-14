import { parseFormula, FormulaParseError, FORMULA_LIMITS } from '../src';
import type { Formula, BinaryOperator, FormulaErrorCode } from '../src';

const variable = (name: string): Formula => ({ type: 'variable', name });
const not = (operand: Formula): Formula => ({ type: 'not', operand });
const binary = (operator: BinaryOperator, left: Formula, right: Formula): Formula => ({
  type: 'binary',
  operator,
  left,
  right,
});
const p = variable('P');
const q = variable('Q');
const r = variable('R');

test('parses a variable and ignores surrounding whitespace', () => {
  expect(parseFormula(' \n P\t ')).toEqual(p);
});

test.each([
  ['¬P', '!P'],
  ['P ∧ Q', 'P & Q'],
  ['P ∨ Q', 'P | Q'],
  ['P → Q', 'P -> Q'],
])('symbol form %s matches alias %s', (symbol, alias) => {
  expect(parseFormula(symbol)).toEqual(parseFormula(alias));
});

test('supports mixing aliases and symbols', () => {
  expect(parseFormula('!(P ∧ Q) -> R')).toEqual(binary('implies', not(binary('and', p, q)), r));
});

test('negation binds more tightly than conjunction', () => {
  expect(parseFormula('¬P ∧ Q')).toEqual(binary('and', not(p), q));
});

test('conjunction binds more tightly than disjunction', () => {
  expect(parseFormula('P ∨ Q ∧ R')).toEqual(binary('or', p, binary('and', q, r)));
});

test('implication has the lowest precedence', () => {
  expect(parseFormula('P ∨ Q → R ∧ ¬S')).toEqual(
    binary('implies', binary('or', p, q), binary('and', r, not(variable('S')))),
  );
});

test('implication associates right', () => {
  expect(parseFormula('P → Q → R')).toEqual(binary('implies', p, binary('implies', q, r)));
});

test.each(['and', 'or'] as const)('%s associates left', (operator) => {
  const symbol = operator === 'and' ? '&' : '|';
  expect(parseFormula(`P ${symbol} Q ${symbol} R`)).toEqual(
    binary(operator, binary(operator, p, q), r),
  );
});

test('parentheses override precedence and implication associativity', () => {
  expect(parseFormula('(P → Q) → R')).toEqual(binary('implies', binary('implies', p, q), r));
  expect(parseFormula('(P ∨ Q) ∧ R')).toEqual(binary('and', binary('or', p, q), r));
});

test('nested groups and repeated negation are preserved semantically', () => {
  expect(parseFormula('((!!P))')).toEqual(not(not(p)));
});

test.each<[string, FormulaErrorCode, number]>([
  ['', 'EXPECTED_EXPRESSION', 0],
  ['   ', 'EXPECTED_EXPRESSION', 3],
  ['P &', 'EXPECTED_EXPRESSION', 3],
  ['()', 'EXPECTED_EXPRESSION', 1],
  ['& P', 'EXPECTED_EXPRESSION', 0],
  ['P && Q', 'EXPECTED_EXPRESSION', 3],
  ['P || Q', 'EXPECTED_EXPRESSION', 3],
  ['P Q', 'UNEXPECTED_TOKEN', 2],
  ['PQ', 'UNEXPECTED_TOKEN', 1],
  ['P)', 'UNEXPECTED_TOKEN', 1],
  ['(P | Q', 'EXPECTED_CLOSING_PAREN', 6],
  ['(P Q)', 'EXPECTED_CLOSING_PAREN', 3],
  ['p', 'INVALID_CHARACTER', 0],
  ['P1', 'INVALID_CHARACTER', 1],
  ['P ↔ Q', 'INVALID_CHARACTER', 2],
  ['P - > Q', 'INVALID_CHARACTER', 2],
])('rejects %j with %s at offset %i', (source, code, position) => {
  try {
    parseFormula(source);
    throw new Error('Expected parsing to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(FormulaParseError);
    expect(error).toMatchObject({ code, position });
    expect((error as Error).message).toContain(`character ${position + 1}`);
  }
});

test('accepts the length limit and rejects longer input, including whitespace', () => {
  expect(parseFormula('P' + ' '.repeat(FORMULA_LIMITS.maxLength - 1))).toEqual(p);
  expect(() => parseFormula('P' + ' '.repeat(FORMULA_LIMITS.maxLength))).toThrow(
    expect.objectContaining({ code: 'FORMULA_TOO_LONG' }),
  );
});

test('accepts four distinct variables but rejects a fifth', () => {
  expect(() => parseFormula('P & Q & R & S & P')).not.toThrow();
  expect(() => parseFormula('P & Q & R & S & T')).toThrow(
    expect.objectContaining({ code: 'VARIABLE_LIMIT', position: 16 }),
  );
});

test.each(['groups', 'negations', 'implications'])('bounds recursive nesting for %s', (kind) => {
  const make = (count: number) =>
    kind === 'groups'
      ? '('.repeat(count) + 'P' + ')'.repeat(count)
      : kind === 'negations'
        ? '!'.repeat(count) + 'P'
        : 'P -> '.repeat(count) + 'P';
  expect(() => parseFormula(make(FORMULA_LIMITS.maxNesting))).not.toThrow();
  expect(() => parseFormula(make(FORMULA_LIMITS.maxNesting + 1))).toThrow(
    expect.objectContaining({ code: 'NESTING_LIMIT' }),
  );
});

test('nesting limit applies across mixed groups, negations, and implications', () => {
  expect(() => parseFormula('!('.repeat(17) + 'P' + ')'.repeat(17))).toThrow(
    expect.objectContaining({ code: 'NESTING_LIMIT' }),
  );
});

test('parses are independent after a prior error', () => {
  expect(() => parseFormula('P & Q & R & S & T')).toThrow();
  expect(parseFormula('A')).toEqual(variable('A'));
});
