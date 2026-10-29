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
  ['¬P', '~P'],
  ['P ↔ Q', 'P<->Q'],
  ['P ∧ Q', 'P & Q'],
  ['P ∨ Q', 'P | Q'],
  ['P ∨ Q', 'P v Q'],
  ['P ∨ Q', 'PvQ'],
  ['P → Q', 'P -> Q'],
])('symbol form %s matches alias %s', (symbol, alias) => {
  expect(parseFormula(symbol)).toEqual(parseFormula(alias));
});

test('supports mixing aliases and symbols', () => {
  expect(parseFormula('!(P ∧ Q) -> R')).toEqual(binary('implies', not(binary('and', p, q)), r));
});

test('uppercase V remains a variable when lowercase v means OR', () => {
  expect(parseFormula('V v P')).toEqual(binary('or', variable('V'), p));
});

test('negation binds more tightly than conjunction', () => {
  expect(parseFormula('¬P ∧ Q')).toEqual(binary('and', not(p), q));
});

test('conjunction binds more tightly than disjunction', () => {
  expect(parseFormula('P ∨ Q ∧ R')).toEqual(binary('or', p, binary('and', q, r)));
});

test('implication binds less tightly than conjunction and disjunction', () => {
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

test('square brackets and nested mixed grouping match parentheses', () => {
  expect(parseFormula('[P & Q] -> R')).toEqual(parseFormula('(P & Q) -> R'));
  expect(parseFormula('[(P v Q) & ![R -> P]]')).toEqual(parseFormula('((P v Q) & !(R -> P))'));
});

test.each<[string, FormulaErrorCode, number]>([
  ['', 'EXPECTED_EXPRESSION', 0],
  ['   ', 'EXPECTED_EXPRESSION', 3],
  ['P &', 'EXPECTED_EXPRESSION', 3],
  ['()', 'EXPECTED_EXPRESSION', 1],
  ['[]', 'EXPECTED_EXPRESSION', 1],
  ['[P)', 'EXPECTED_CLOSING_BRACKET', 2],
  ['(P]', 'EXPECTED_CLOSING_PAREN', 2],
  ['[P', 'EXPECTED_CLOSING_BRACKET', 2],
  ['[(P])', 'EXPECTED_CLOSING_PAREN', 3],
  ['P]', 'UNEXPECTED_TOKEN', 1],
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

test.each(['groups', 'brackets', 'negations', 'implications'])(
  'bounds recursive nesting for %s',
  (kind) => {
    const make = (count: number) =>
      kind === 'brackets'
        ? '['.repeat(count) + 'P' + ']'.repeat(count)
        : kind === 'groups'
          ? '('.repeat(count) + 'P' + ')'.repeat(count)
          : kind === 'negations'
            ? '!'.repeat(count) + 'P'
            : 'P -> '.repeat(count) + 'P';
    expect(() => parseFormula(make(FORMULA_LIMITS.maxNesting))).not.toThrow();
    expect(() => parseFormula(make(FORMULA_LIMITS.maxNesting + 1))).toThrow(
      expect.objectContaining({ code: 'NESTING_LIMIT' }),
    );
  },
);

test('nesting limit applies across mixed groups, negations, and implications', () => {
  expect(() => parseFormula('!('.repeat(17) + 'P' + ')'.repeat(17))).toThrow(
    expect.objectContaining({ code: 'NESTING_LIMIT' }),
  );
});

test('parses are independent after a prior error', () => {
  expect(() => parseFormula('P & Q & R & S & T')).toThrow();
  expect(parseFormula('A')).toEqual(variable('A'));
});

test('biconditional binds less tightly than implication on either side', () => {
  expect(parseFormula('P -> Q <-> R')).toEqual(binary('iff', binary('implies', p, q), r));
  expect(parseFormula('P <-> Q -> R')).toEqual(binary('iff', p, binary('implies', q, r)));
  expect(parseFormula('~P & Q | R -> P <-> Q')).toEqual(
    binary('iff', binary('implies', binary('or', binary('and', not(p), q), r), p), q),
  );
});

test('explicitly grouped biconditionals can nest on either side with mixed delimiters', () => {
  expect(parseFormula('[P <-> Q] ↔ R')).toEqual(binary('iff', binary('iff', p, q), r));
  expect(parseFormula('P ↔ [Q <-> R]')).toEqual(binary('iff', p, binary('iff', q, r)));
  expect(parseFormula('~[P <-> !Q]')).toEqual(not(binary('iff', p, not(q))));
});

test('ungrouped biconditional chains identify the second operator and explain grouping', () => {
  try {
    parseFormula('P <-> Q ↔ R');
    throw new Error('Expected rejection');
  } catch (error) {
    expect(error).toBeInstanceOf(FormulaParseError);
    expect(error).toMatchObject({ code: 'UNEXPECTED_TOKEN', position: 8 });
    expect((error as Error).message).toContain('Group repeated biconditionals explicitly');
  }
});

test.each([
  ['P <->', 'EXPECTED_EXPRESSION', 5],
  ['<-> P', 'EXPECTED_EXPRESSION', 0],
  ['P <-> <-> Q', 'EXPECTED_EXPRESSION', 6],
  ['P < -> Q', 'INVALID_CHARACTER', 2],
  ['P <- > Q', 'INVALID_CHARACTER', 2],
  ['P <=> Q', 'INVALID_CHARACTER', 2],
  ['~', 'EXPECTED_EXPRESSION', 1],
  ['[P ↔ Q)', 'EXPECTED_CLOSING_BRACKET', 6],
] as const)('malformed notation %s reports a useful position', (source, code, position) => {
  expect(() => parseFormula(source)).toThrow(FormulaParseError);
  try {
    parseFormula(source);
  } catch (error) {
    expect(error).toMatchObject({ code, position });
  }
});

test('new notation retains existing variable, length and nesting bounds', () => {
  for (const [source, code] of [
    ['~'.repeat(FORMULA_LIMITS.maxNesting + 1) + 'P', 'NESTING_LIMIT'],
    ['P ↔ (Q & R & S & T)', 'VARIABLE_LIMIT'],
    ['P<->Q' + ' '.repeat(FORMULA_LIMITS.maxLength), 'FORMULA_TOO_LONG'],
  ]) {
    try {
      parseFormula(source!);
      throw new Error('Expected bounded parsing to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(FormulaParseError);
      expect(error).toMatchObject({ code });
    }
  }
});
