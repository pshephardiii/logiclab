import { expect, test } from 'vitest';
import { proofConjunctChoices, proofConjunctRequirement } from './conjunct-choices';

test.each([
  ['P & Q & R', ['1. P', '2. Q', '3. R']],
  ['(P & Q) & R', ['1. (P ∧ Q)', '2. R']],
  ['P & [Q & R]', ['1. P', '2. [Q ∧ R]']],
  ['(P & Q & R)', ['1. P', '2. Q', '3. R']],
  ['P & P', ['1. P', '2. P']],
  ['_|_ & P', ['1. ⊥', '2. P']],
  ['P v Q', []],
  ['!(P & Q)', []],
  ['P & Q -> R', []],
  ['P &', []],
] as const)('source choices preserve the authored units in %s', (source, labels) => {
  expect(proofConjunctChoices(source).map((choice) => choice.label)).toEqual(labels);
});

test('a choice must exist under supplied provenance, while no entered result is evaluated', () => {
  const sources = new Map([['source', '(P & Q) & R']]);
  const step = { ruleId: 'and_chain_elimination', lineReferences: ['source'], conjunctIndex: 1 };
  expect(proofConjunctRequirement(step, sources)).toBeNull();
  for (const index of [null, -1, 1.5, 2, NaN])
    expect(proofConjunctRequirement({ ...step, conjunctIndex: index }, sources)).toMatch(
      /available conjunct/,
    );
  expect(proofConjunctRequirement(step)).toMatch(/available conjunct/);
  expect(proofConjunctRequirement({ ...step, ruleId: 'reiteration' }, sources)).toMatch(/Clear/);
  expect(
    proofConjunctRequirement({ ruleId: 'reiteration', lineReferences: ['source'] }),
  ).toBeNull();
});
