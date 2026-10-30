import {
  FormulaParseError,
  parseFormula,
  generateTruthTable,
  FORMULA_LIMITS,
  type FormulaErrorCode,
} from '../src';
import { parseProofFormula, sameFormula, PROOF_FORMULA_LIMITS } from '../src/proof';

test.each(['⊥', '_|_', ' [ _|_ ] '])('parses proof falsity %s as a distinct atom', (source) => {
  expect(parseProofFormula(source)).toEqual({ type: 'bottom' });
});

test('falsity works inside compound formulas without conflating ordinary F', () => {
  expect(
    sameFormula(parseProofFormula('~_|_ -> (P v ⊥)'), parseProofFormula('¬⊥ → (P ∨ _|_)')),
  ).toBe(true);
  expect(sameFormula(parseProofFormula('F'), parseProofFormula('⊥'))).toBe(false);
  expect(sameFormula(parseProofFormula('!F'), parseProofFormula('!⊥'))).toBe(false);
  expect(sameFormula(parseProofFormula('⊥'), parseProofFormula('F'))).toBe(false);
  expect(parseProofFormula('F')).toEqual({ type: 'variable', name: 'F' });
});

test.each(['P & Q -> R <-> S', '!(P | Q)', 'P -> Q -> R', '(P <-> Q) <-> R', '[P & (Q v R)]'])(
  'shared grammar preserves ordinary ASTs: %s',
  (source) => {
    expect(parseProofFormula(source)).toEqual(parseFormula(source));
  },
);

test.each<[string, object]>([
  ['P -> _|_ & Q', { type: 'binary', operator: 'implies' }],
  ['⊥ <-> (P -> Q)', { type: 'binary', operator: 'iff' }],
  ['!_|_', { type: 'not', operand: { type: 'bottom' } }],
])('proof notation retains precedence: %s', (source, expected) => {
  expect(parseProofFormula(source)).toMatchObject(expected);
});

test.each<[string, FormulaErrorCode, number]>([
  ['_|', 'INVALID_CHARACTER', 0],
  ['_ | _', 'INVALID_CHARACTER', 0],
  ['⊥ P', 'UNEXPECTED_TOKEN', 2],
  ['P ->', 'EXPECTED_EXPRESSION', 4],
  ['(⊥]', 'EXPECTED_CLOSING_PAREN', 2],
  ['[⊥)', 'EXPECTED_CLOSING_BRACKET', 2],
  ['P <-> ⊥ <-> Q', 'UNEXPECTED_TOKEN', 8],
  ['FALSE', 'UNEXPECTED_TOKEN', 1],
  ['P 😀', 'INVALID_CHARACTER', 2],
  ['', 'EXPECTED_EXPRESSION', 0],
])('proof syntax errors retain positioned diagnostics: %s', (source, code, position) => {
  try {
    parseProofFormula(source);
    throw new Error('Expected a parse failure');
  } catch (error) {
    expect(error).toBeInstanceOf(FormulaParseError);
    expect(error).toMatchObject({ code, position });
  }
});

test('proof-only variable and nesting limits do not relax table limits', () => {
  const allVariables = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').join(' & ');
  expect(parseProofFormula(allVariables).type).toBe('binary');
  expect(() => parseFormula(allVariables)).toThrow(
    expect.objectContaining({ code: 'VARIABLE_LIMIT' }),
  );
  expect(FORMULA_LIMITS.maxVariables).toBe(4);
  expect(PROOF_FORMULA_LIMITS.maxVariables).toBe(26);
  expect(() => parseProofFormula('!'.repeat(33) + '⊥')).toThrow(
    expect.objectContaining({ code: 'NESTING_LIMIT' }),
  );
  expect(() => parseProofFormula(' '.repeat(256) + 'P')).toThrow(
    expect.objectContaining({ code: 'FORMULA_TOO_LONG', position: 256 }),
  );
  expect(parseProofFormula(' '.repeat(255) + 'P')).toEqual({ type: 'variable', name: 'P' });
});

test.each(['⊥', '_|_', 'P -> ⊥'])(
  'ordinary parsing and table generation still reject %s',
  (source) => {
    expect(() => parseFormula(source)).toThrow(
      expect.objectContaining({ code: 'INVALID_CHARACTER' }),
    );
    expect(() => generateTruthTable(source)).toThrow(
      expect.objectContaining({ code: 'INVALID_CHARACTER' }),
    );
  },
);

test('ordinary table identifiers and parser errors retain their contract', () => {
  const table = generateTruthTable('P -> Q');
  expect(table.columns.some((column) => column.id === 'expr:v1:(P → Q)')).toBe(true);
  expect(() => parseFormula('⊥')).toThrow(
    'Unexpected character "⊥"; use A–Z, ¬/!/~, ∧/&, ∨/v/|, →/->, ↔/<->, parentheses, or square brackets (at character 1).',
  );
});
