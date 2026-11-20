import { expect, test } from 'vitest';
import { initialTruthTree, appendTruthTreeExpansion, undoTruthTreeExpansion } from './construction';
import {
  truthTreeFormulaLabel,
  truthTreeFormulaProgress,
  unexpectedFormulaCharacter,
} from './formula-presentation';

test.each([
  ['!(P)', '¬P'],
  ['!P', '¬P'],
  ['!!(P)', '¬¬P'],
  ['![(P -> Q)]', '¬(P → Q)'],
  ['P & (Q v R)', 'P ∧ (Q ∨ R)'],
  ['(P -> Q) -> R', '(P → Q) → R'],
  ['~_|_', '¬⊥'],
  ['P &', 'P ∧'],
  ['', '(blank)'],
])('display grouping preserves meaning for %s', (input, label) => {
  expect(truthTreeFormulaLabel(input)).toBe(label);
});

test('progress tracks path-specific applications, literals, undo and malformed drafts without checking correctness', () => {
  const initial = initialTruthTree({
    premises: [
      { id: crypto.randomUUID(), formula: 'P v Q' },
      { id: crypto.randomUUID(), formula: 'R & S' },
    ],
    conclusion: 'P',
  });
  const [split, conjunction, literal] = initial.occurrences;
  const before = structuredClone(initial);
  expect(truthTreeFormulaProgress(initial).get(conjunction!.id)).toBe('pending');
  expect(truthTreeFormulaProgress(initial).get(literal!.id)).toBe('literal');
  const fork = appendTruthTreeExpansion(initial, initial.rootBranchId!, split!.id, 'disjunction', [
    ['P'],
    ['Q'],
  ]);
  const [left, right] = fork.expansions[0]!.resultGroups;
  // Even deliberately wrong entered results count as an application, never as verification.
  const partial = appendTruthTreeExpansion(fork, left!.branchId, conjunction!.id, 'conjunction', [
    ['T', 'U'],
  ]);
  expect(truthTreeFormulaProgress(partial).get(split!.id)).toBe('applied');
  expect(truthTreeFormulaProgress(partial).get(conjunction!.id)).toBe('partial');
  const complete = appendTruthTreeExpansion(
    partial,
    right!.branchId,
    conjunction!.id,
    'conjunction',
    [['R', 'S']],
  );
  expect(truthTreeFormulaProgress(complete).get(conjunction!.id)).toBe('applied');
  expect(truthTreeFormulaProgress(undoTruthTreeExpansion(complete)!).get(conjunction!.id)).toBe(
    'partial',
  );
  const malformed = structuredClone(initial);
  malformed.occurrences[0]!.formula = 'P &';
  expect(truthTreeFormulaProgress(malformed).get(split!.id)).toBe('invalid');
  expect(truthTreeFormulaProgress({ ...initial, rootBranchId: null }).size).toBe(0);
  expect(initial).toEqual(before);
});

test('character highlights preserve exact offsets and whole Unicode characters', () => {
  expect(unexpectedFormulaCharacter('P @ Q')).toEqual({ formula: 'P @ Q', position: 2, length: 1 });
  expect(unexpectedFormulaCharacter('P 😀 Q')).toEqual({
    formula: 'P 😀 Q',
    position: 2,
    length: 2,
  });
  expect(unexpectedFormulaCharacter('P ^ Q')).toBeNull();
  expect(unexpectedFormulaCharacter('P &')).toBeNull();
});
