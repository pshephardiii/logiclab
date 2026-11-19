import { evaluateFormula, parseFormula } from '../../src';
import {
  areTruthTreeComplements,
  decomposeTruthTreeFormula,
  parseTruthTreeFormula,
  TRUTH_TREE_FORMULA_LIMITS,
  TRUTH_TREE_RULE_CATALOG,
  TRUTH_TREE_RULE_CATALOG_VERSION,
} from '../../src/truth-tree';
import type { TruthTreeRuleId } from '../../src/truth-tree';

const expansions: [string, TruthTreeRuleId, string[][]][] = [
  ['!!P', 'double_negation', [['P']]],
  ['P & Q', 'conjunction', [['P', 'Q']]],
  ['!(P & Q)', 'negated_conjunction', [['!P'], ['!Q']]],
  ['P v Q', 'disjunction', [['P'], ['Q']]],
  ['!(P v Q)', 'negated_disjunction', [['!P', '!Q']]],
  ['P -> Q', 'conditional', [['!P'], ['Q']]],
  ['!(P -> Q)', 'negated_conditional', [['P', '!Q']]],
  [
    'P <-> Q',
    'biconditional',
    [
      ['P', 'Q'],
      ['!P', '!Q'],
    ],
  ],
  [
    '!(P <-> Q)',
    'negated_biconditional',
    [
      ['P', '!Q'],
      ['!P', 'Q'],
    ],
  ],
];

test.each(expansions)('%s has the exact unsigned %s expansion', (source, ruleId, branches) => {
  expect(decomposeTruthTreeFormula(parseTruthTreeFormula(source))).toEqual({
    kind: 'expansion',
    ruleId,
    branches: branches.map((branch) => branch.map(parseTruthTreeFormula)),
  });
});

test.each(expansions)(
  '%s preserves truth conditions, including compound substitutions',
  (source, ruleId, branches) => {
    for (const compound of [false, true]) {
      const substitute = (text: string) =>
        compound ? text.replace(/\bP\b/g, '(P -> R)').replace(/\bQ\b/g, '(Q v R)') : text;
      const formula = parseTruthTreeFormula(substitute(source));
      const before = structuredClone(formula);
      const expected = branches.map((branch) =>
        branch.map((text) => parseFormula(substitute(text))),
      );
      const result = decomposeTruthTreeFormula(formula);

      expect(result).toEqual({ kind: 'expansion', ruleId, branches: expected });

      for (let bits = 0; bits < 8; bits++) {
        const assignment = { P: Boolean(bits & 1), Q: Boolean(bits & 2), R: Boolean(bits & 4) };
        const sourceValue = evaluateFormula(parseFormula(substitute(source)), assignment);
        const expansionValue = expected.some((branch) =>
          branch.every((entry) => evaluateFormula(entry, assignment)),
        );

        expect(expansionValue).toBe(sourceValue);
      }

      expect(formula).toEqual(before);
    }
  },
);

test.each(['P', '~P', 'Z', '!F'])('%s is a literal, not a decomposition step', (source) => {
  expect(decomposeTruthTreeFormula(parseTruthTreeFormula(source))).toEqual({ kind: 'literal' });
});

test.each([
  ['⊥', false],
  ['_|_', false],
  ['¬⊥', true],
  ['~_|_', true],
] as const)('%s is a terminal constant with value %s', (source, value) => {
  expect(decomposeTruthTreeFormula(parseTruthTreeFormula(source))).toEqual({
    kind: 'constant',
    value,
  });
});

test('double negation is explicit even on constants; F remains an ordinary variable', () => {
  expect(decomposeTruthTreeFormula(parseTruthTreeFormula('!!⊥'))).toEqual({
    kind: 'expansion',
    ruleId: 'double_negation',
    branches: [[{ type: 'bottom' }]],
  });
  expect(parseTruthTreeFormula('F')).toEqual({ type: 'variable', name: 'F' });
});

test.each([
  ['P', '!P'],
  ['P & Q', '~[P & Q]'],
  ['~P', '!!P'],
  ['P <-> Q', '¬(P ↔ Q)'],
  ['⊥', '!_|_'],
])('closure complements are symmetric and structural: %s, %s', (a, b) => {
  const left = parseTruthTreeFormula(a);
  const right = parseTruthTreeFormula(b);
  expect(areTruthTreeComplements(left, right)).toBe(true);
  expect(areTruthTreeComplements(right, left)).toBe(true);
});

test.each([
  ['P', 'P'],
  ['P', '!!!P'],
  ['P & Q', '!(Q & P)'],
  ['P -> Q', '!(!P v Q)'],
  ['P', '!Q'],
  ['F', '⊥'],
])('closure does not silently rewrite or equate formulas: %s, %s', (a, b) => {
  expect(areTruthTreeComplements(parseTruthTreeFormula(a), parseTruthTreeFormula(b))).toBe(false);
});

test('catalog is frozen, unique and agrees with every expansion variant', () => {
  expect(TRUTH_TREE_RULE_CATALOG_VERSION).toBe(1);
  expect(Object.isFrozen(TRUTH_TREE_RULE_CATALOG)).toBe(true);
  expect(TRUTH_TREE_RULE_CATALOG.every(Object.isFrozen)).toBe(true);
  expect(TRUTH_TREE_RULE_CATALOG.map((rule) => rule.id)).toEqual(
    expansions.map((entry) => entry[1]),
  );
  expect(new Set(TRUTH_TREE_RULE_CATALOG.map((rule) => rule.id)).size).toBe(9);

  for (const [source, id] of expansions) {
    const rule = TRUTH_TREE_RULE_CATALOG.find((entry) => entry.id === id)!;
    const result = decomposeTruthTreeFormula(parseTruthTreeFormula(source));
    expect(result.kind === 'expansion' && result.branches.length === 2).toBe(rule.branching);
  }
});

test('shared grammar accepts all 26 variables and aliases without changing table bounds', () => {
  expect(() =>
    parseTruthTreeFormula('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').join(' & ')),
  ).not.toThrow();
  expect(parseTruthTreeFormula('~[P v Q] <-> (_|_ -> R)')).toEqual(
    parseTruthTreeFormula('¬(P ∨ Q) ↔ (⊥ → R)'),
  );
  expect(() => parseFormula('P & Q & R & S & T')).toThrow();
  expect(() => parseFormula('⊥')).toThrow();
});

test.each(['', 'P &', '[P)', 'P <-> Q <-> R', 'p', 'P @ Q'])(
  'malformed input is rejected: %s',
  (source) => {
    expect(() => parseTruthTreeFormula(source)).toThrow();
  },
);

test('truth-tree parsing retains shared length and nesting protection', () => {
  expect(TRUTH_TREE_FORMULA_LIMITS).toMatchObject({
    maxLength: 256,
    maxNesting: 32,
    maxVariables: 26,
  });
  expect(() => parseTruthTreeFormula('P'.repeat(257))).toThrow(/at most 256/);
  expect(() => parseTruthTreeFormula('!'.repeat(33) + 'P')).toThrow(/nested/);
});
