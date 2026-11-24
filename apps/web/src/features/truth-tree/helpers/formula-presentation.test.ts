import { truthTreeFormulaProgress } from './formula-progress';
import { expect, test } from 'vitest';
import { initialTruthTree, appendTruthTreeExpansion, undoTruthTreeExpansion } from './construction';
import { truthTreeFormulaLabel, unexpectedFormulaCharacter } from './formula-presentation';

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

test('catalog-2 display preserves authored binary groups without inventing left-fold parentheses', () => {
  expect(truthTreeFormulaLabel('P & Q & R', 2)).toBe('P ∧ Q ∧ R');
  expect(truthTreeFormulaLabel('(P & Q) & R', 2)).toBe('(P ∧ Q) ∧ R');
  expect(truthTreeFormulaLabel('P v [Q v R]', 2)).toBe('P ∨ [Q ∨ R]');
  expect(truthTreeFormulaLabel('!(P)', 2)).toBe('¬P');
  expect(truthTreeFormulaLabel('P &', 2)).toBe('P ∧');
  expect(truthTreeFormulaLabel('P & Q & R', 1)).toBe('(P ∧ Q) ∧ R');
});

test('partial conjunct use counts distinct positions and remains local to each path', () => {
  const initial = initialTruthTree({
    ruleCatalogVersion: 2,
    premises: [
      { id: crypto.randomUUID(), formula: 'P & Q & P' },
      { id: crypto.randomUUID(), formula: 'R v S' },
    ],
    conclusion: 'T',
  });
  const source = initial.occurrences[0]!.id;
  const root = initial.rootBranchId!;
  const extract = (tree: typeof initial, branch: string, memberIndex: number) =>
    appendTruthTreeExpansion(tree, branch, source, 'conjunct_extraction', [['U']], {
      ruleId: 'conjunct_extraction',
      memberIndex,
    });
  let tree = extract(initial, root, 0);
  expect(truthTreeFormulaProgress(tree).get(source)).toBe('partial');
  tree = extract(tree, root, 0);
  expect(truthTreeFormulaProgress(tree).get(source)).toBe('partial');
  tree = appendTruthTreeExpansion(
    tree,
    root,
    initial.occurrences[1]!.id,
    'disjunction',
    [['R'], ['S']],
    { ruleId: 'disjunction', splitIndex: 1 },
  );
  const [left, right] = tree.expansions.at(-1)!.resultGroups;
  tree = extract(extract(tree, left!.branchId, 1), left!.branchId, 2);
  expect(truthTreeFormulaProgress(tree).get(source)).toBe('partial');
  tree = extract(extract(tree, right!.branchId, 1), right!.branchId, 2);
  // Even wrong result U tracks use, never correctness feedback.
  expect(truthTreeFormulaProgress(tree).get(source)).toBe('applied');
  expect(truthTreeFormulaProgress(undoTruthTreeExpansion(tree)!).get(source)).toBe('partial');
});
