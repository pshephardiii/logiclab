import { expect, test } from 'vitest';
import { truthTreeChainChoices } from './chain-choices';

test('conjunct choices retain explicit boundaries and duplicate positions', () => {
  expect(
    truthTreeChainChoices('P & Q & P', 'conjunct_extraction').map((option) => option.label),
  ).toEqual(['1. P', '2. Q', '3. P']);
  expect(
    truthTreeChainChoices('(P & Q) & R', 'conjunct_extraction').map((option) => option.label),
  ).toEqual(['1. (P ∧ Q)', '2. R']);
  expect(truthTreeChainChoices('(P & Q & R)', 'conjunct_extraction')).toHaveLength(3);
});

test('cuts preserve all ordered alternatives and stop at explicit groups', () => {
  expect(truthTreeChainChoices('P v Q v R', 'disjunction').map((option) => option.label)).toEqual([
    'P │ Q ∨ R',
    'P ∨ Q │ R',
  ]);
  expect(truthTreeChainChoices('(P v Q) v R', 'disjunction').map((option) => option.label)).toEqual(
    ['(P ∨ Q) │ R'],
  );
  expect(truthTreeChainChoices('P v (Q v R)', 'disjunction').map((option) => option.label)).toEqual(
    ['P │ (Q ∨ R)'],
  );
});

test.each(['P', '!P', '!(P v Q)', 'P &', 'P v Q -> R'])(
  'unavailable chain choices do not invent a decomposition: %s',
  (source) => {
    expect(truthTreeChainChoices(source, 'disjunction')).toEqual([]);
  },
);
