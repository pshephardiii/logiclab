import {
  sameFormula,
  PROPOSITIONAL_RULE_CATALOG,
  PROPOSITIONAL_RULE_CATALOG_VERSION,
  getPropositionalRule,
} from '../src/proof';
import { parseFormula } from '../src';

test.each([
  ['P', ' (P) '],
  ['~[P v Q]', '¬(P ∨ Q)'],
  ['P & (Q -> R)', 'P ∧ [Q → R]'],
  ['P <-> Q', '[P ↔ Q]'],
  ['P -> Q -> R', 'P -> (Q -> R)'],
])('formula matching ignores notation/grouping differences: %s and %s', (a, b) => {
  expect(sameFormula(parseFormula(a), parseFormula(b))).toBe(true);
});

test.each([
  ['P', 'Q'],
  ['P', '!!P'],
  ['P & Q', 'Q & P'],
  ['P | Q', 'Q | P'],
  ['P <-> Q', 'Q <-> P'],
  ['P -> Q', '!P | Q'],
  ['P -> Q -> R', '(P -> Q) -> R'],
  ['(P & Q) & R', 'P & (Q & R)'],
  ['!(P & Q)', '!P | !Q'],
  ['P & Q', 'P | Q'],
])('matching never silently applies equivalence rules: %s and %s', (a, b) => {
  expect(sameFormula(parseFormula(a), parseFormula(b))).toBe(false);
});

test('matching parsed inputs does not alter either syntax tree', () => {
  const left = parseFormula('~[P <-> Q]');
  const right = parseFormula('¬(P ↔ Q)');
  const before = structuredClone([left, right]);
  sameFormula(left, right);
  expect([left, right]).toEqual(before);
});

test('the versioned catalog keeps display aliases separate from supported rule identities', () => {
  expect(PROPOSITIONAL_RULE_CATALOG_VERSION).toBe(1);
  const ids = PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(getPropositionalRule('implication_elimination')?.aliases).toContain('Modus ponens');
  expect(getPropositionalRule('implication_elimination')?.aliases).toContain(
    'Conditional elimination',
  );
  expect(getPropositionalRule('Modus ponens')).toBeUndefined();
  expect(getPropositionalRule('custom_rule')).toBeUndefined();
});

test('subproof and classical variants have explicit citation requirements', () => {
  expect(getPropositionalRule('or_elimination')).toMatchObject({
    lineReferences: 1,
    subproofReferences: 2,
  });
  expect(getPropositionalRule('negation_introduction')).toMatchObject({
    category: 'core',
    lineReferences: 0,
    subproofReferences: 1,
  });
  expect(getPropositionalRule('proof_by_contradiction')).toMatchObject({
    category: 'classical',
    lineReferences: 0,
    subproofReferences: 1,
  });
  expect(getPropositionalRule('double_negation_elimination')).toMatchObject({
    category: 'classical',
    lineReferences: 1,
    subproofReferences: 0,
  });
  expect(getPropositionalRule('excluded_middle')).toMatchObject({
    category: 'classical',
    lineReferences: 0,
    subproofReferences: 0,
  });
  expect(getPropositionalRule('biconditional_introduction')).toMatchObject({
    lineReferences: 2,
    subproofReferences: 0,
  });
  expect(getPropositionalRule('biconditional_elimination')).toMatchObject({
    lineReferences: 1,
    subproofReferences: 0,
  });
});

test('catalog metadata and aliases cannot be mutated by consumers', () => {
  expect(Object.isFrozen(PROPOSITIONAL_RULE_CATALOG)).toBe(true);
  for (const rule of PROPOSITIONAL_RULE_CATALOG) {
    expect(Object.isFrozen(rule)).toBe(true);
    expect(Object.isFrozen(rule.aliases)).toBe(true);
  }
});
