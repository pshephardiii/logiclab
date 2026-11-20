import { expect, test } from 'vitest';
import { initialTruthTree, appendTruthTreeExpansion } from './construction';
import { truthTreeLayout } from './layout';

function fixture() {
  const initial = initialTruthTree({
    premises: ['P v Q', 'R & S'].map((formula) => ({ id: crypto.randomUUID(), formula })),
    conclusion: 'T',
  });
  const root = initial.rootBranchId!;
  const split = appendTruthTreeExpansion(initial, root, initial.occurrences[0]!.id, 'disjunction', [
    ['P'],
    ['Q'],
  ]);
  const left = split.branches[1]!.id;
  const right = split.branches[2]!.id;
  const leftStack = appendTruthTreeExpansion(
    split,
    left,
    initial.occurrences[1]!.id,
    'conjunction',
    [['R', 'S']],
  );
  const tree = appendTruthTreeExpansion(
    leftStack,
    right,
    initial.occurrences[1]!.id,
    'conjunction',
    [['R', 'S']],
  );
  return { initial, tree, left, right };
}

test('aligns sibling results and staggers separate expansions without changing stored identities or work', () => {
  const { tree } = fixture();
  const before = structuredClone(tree);
  const layout = truthTreeLayout(tree)!;
  const [split, left, right] = tree.expansions;
  const row = (id: string) => layout.rows.get(id)!;
  const splitResults = split!.resultGroups.map((group) => row(group.occurrenceIds[0]!));
  const leftRows = left!.resultGroups[0]!.occurrenceIds.map(row);
  const rightRows = right!.resultGroups[0]!.occurrenceIds.map(row);

  expect(splitResults[0]).toBe(splitResults[1]);
  expect(leftRows[0]).toBeGreaterThan(splitResults[0]!);
  expect(leftRows[1]).toBe(leftRows[0]! + 1);
  expect(rightRows[0]).toBeGreaterThan(leftRows[1]!);
  expect(rightRows[1]).toBe(rightRows[0]! + 1);
  expect(layout.rows.size).toBe(tree.occurrences.length);
  expect(layout.numbers.get(right!.resultGroups[0]!.occurrenceIds[0]!)).toBe(
    tree.occurrences.length - 1,
  );
  expect(tree).toEqual(before);
});

test('allocates distinct terminal columns and centers an unbalanced trunk over its leaves', () => {
  const { initial, tree, left } = fixture();
  const nested = appendTruthTreeExpansion(tree, left, initial.occurrences[0]!.id, 'disjunction', [
    ['P'],
    ['Q'],
  ]);
  const layout = truthTreeLayout(nested)!;
  const leaves = layout.structure.branchOrder.filter(
    (id) => layout.structure.branches.get(id)!.ending.kind !== 'split',
  );
  const columns = leaves.map((id) => layout.branches.get(id)!.column);

  expect(layout.leafCount).toBe(3);
  expect(new Set(columns).size).toBe(3);
  expect(columns).toEqual([...columns].sort((a, b) => a - b));
  expect(layout.branches.get(nested.rootBranchId!)!.column).toBe(
    (columns[0]! + columns.at(-1)!) / 2,
  );
  expect(layout.forks).toHaveLength(2);
  for (const fork of layout.forks) {
    expect(fork.parentOffset).toBeGreaterThan(0);
    expect(fork.parentOffset).toBeLessThan(100);
  }
});

test('reordered transport arrays still put ancestors and earlier segment work before dependent results', () => {
  const { tree } = fixture();
  const reordered = {
    ...tree,
    expansions: [...tree.expansions].reverse(),
    branches: [...tree.branches].reverse(),
  };
  const layout = truthTreeLayout(reordered)!;

  for (const expansion of tree.expansions) {
    const sourceRow = layout.rows.get(expansion.sourceId!)!;
    for (const group of expansion.resultGroups) {
      for (const id of group.occurrenceIds) expect(layout.rows.get(id)).toBeGreaterThan(sourceRow);
    }
  }
  expect(layout.rows.size).toBe(tree.occurrences.length);
  expect(new Set(layout.numbers.keys())).toEqual(new Set(tree.occurrences.map((item) => item.id)));
});

test('retains blank formulas and repeated text as separate occurrences without checking correctness', () => {
  const { tree } = fixture();
  const entered = {
    ...tree,
    occurrences: tree.occurrences.map((item) => ({
      ...item,
      formula: item.origin.kind === 'expansion' ? '' : 'P',
    })),
  };
  const layout = truthTreeLayout(entered)!;

  expect(layout.rows.size).toBe(entered.occurrences.length);
  expect(layout.structure.tree.occurrences.map((item) => item.formula)).toEqual(
    entered.occurrences.map((item) => item.formula),
  );
});
