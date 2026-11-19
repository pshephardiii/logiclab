import { expect, test } from 'vitest';
import { checkTruthTree, TRUTH_TREE_RULE_CATALOG } from '@logiclab/logic-engine/truth-tree';
import { truthTreeDefinition } from '../../../../test/truth-tree';
import {
  initialTruthTree,
  appendTruthTreeExpansion,
  closeTruthTreeBranch,
  reopenTruthTreeBranch,
  undoTruthTreeExpansion,
  truthTreeInitialMatches,
  editableTree,
} from './construction';

function fixture() {
  const statement = {
    ...truthTreeDefinition,
    premises: [{ id: crypto.randomUUID(), formula: 'P v Q' }],
    conclusion: 'R',
  };
  const tree = initialTruthTree(statement);
  return { statement, tree, root: tree.rootBranchId!, source: tree.occurrences[0]!.id };
}

test('initial sources retain supplied premise identity once and negate the conclusion without guessing an outcome', () => {
  const f = fixture();
  expect(f.tree.occurrences).toHaveLength(2);
  expect(f.tree.occurrences[0]).toMatchObject({
    formula: 'P v Q',
    origin: { premiseId: f.statement.premises[0]!.id },
  });
  expect(f.tree.occurrences[1]).toMatchObject({
    formula: '¬(R)',
    origin: { kind: 'negated_conclusion' },
  });
  expect(truthTreeInitialMatches(f.statement, f.tree)).toBe(true);
  expect(truthTreeInitialMatches({ ...f.statement, conclusion: 'S' }, f.tree)).toBe(false);
  expect(
    truthTreeInitialMatches(
      { ...f.statement, premises: [{ ...f.statement.premises[0]!, formula: 'P ∨ Q' }] },
      f.tree,
    ),
  ).toBe(true);
  const duplicate = initialTruthTree({
    ...f.statement,
    premises: [f.statement.premises[0]!, { id: crypto.randomUUID(), formula: 'P v Q' }],
  });
  expect(duplicate.occurrences).toHaveLength(3);
  expect(new Set(duplicate.occurrences.map((item) => item.id)).size).toBe(3);
});

test.each(TRUTH_TREE_RULE_CATALOG)(
  '$id commits exactly its selected fields with separate occurrence identities',
  (rule) => {
    const f = fixture();
    const before = structuredClone(f.tree);
    const formulas = rule.resultFormulaCounts.map((count) =>
      Array.from({ length: count }, () => 'P'),
    );
    const next = appendTruthTreeExpansion(f.tree, f.root, f.source, rule.id, formulas);
    expect(next.expansions[0]?.resultGroups.map((group) => group.occurrenceIds.length)).toEqual([
      ...rule.resultFormulaCounts,
    ]);
    expect(next.branches).toHaveLength(rule.branching ? 3 : 1);
    expect(editableTree(next)).not.toBeNull();
    expect(f.tree).toEqual(before);
    expect(undoTruthTreeExpansion(next)).toEqual(f.tree);
  },
);

test('ancestor sources flow to both children while sibling references and premature parent expansion are rejected', () => {
  const f = fixture();
  const next = appendTruthTreeExpansion(f.tree, f.root, f.source, 'disjunction', [['P'], ['Q']]);
  const [left, right] = next.branches.slice(1);
  expect(left && right).toBeTruthy();
  const resolved = editableTree(next)!;
  expect(resolved.paths.get(left!.id)).toContain(f.source);
  expect(resolved.paths.get(right!.id)).toContain(f.source);
  expect(() =>
    appendTruthTreeExpansion(next, f.root, f.source, 'double_negation', [['P']]),
  ).toThrow();
  expect(() =>
    appendTruthTreeExpansion(next, left!.id, right!.occurrenceIds[0]!, 'double_negation', [['P']]),
  ).toThrow();
  expect(() =>
    closeTruthTreeBranch(next, left!.id, {
      kind: 'falsity',
      occurrenceId: right!.occurrenceIds[0]!,
    }),
  ).toThrow();
  expect(() =>
    appendTruthTreeExpansion(f.tree, f.root, f.source, 'biconditional', [['P'], ['Q']]),
  ).toThrow();
  expect(() =>
    appendTruthTreeExpansion(f.tree, f.root, f.source, 'conjunction', [['P', '']]),
  ).toThrow();
});

test('closures remain explicit and can be wrong, reopened or removed by undo without mutating source data', () => {
  const f = fixture();
  const expanded = appendTruthTreeExpansion(f.tree, f.root, f.source, 'disjunction', [
    ['P'],
    ['Q'],
  ]);
  const left = expanded.branches[1]!;
  const closed = closeTruthTreeBranch(expanded, left.id, {
    kind: 'complement',
    occurrenceIds: [f.source, left.occurrenceIds[0]!],
  });
  expect(
    checkTruthTree({
      problem: {
        ruleCatalogVersion: 1,
        premises: f.statement.premises,
        conclusion: f.statement.conclusion,
      },
      tree: closed,
    }).status,
  ).toBe('invalid');
  expect(reopenTruthTreeBranch(closed, left.id)).toEqual(expanded);
  expect(undoTruthTreeExpansion(closed)).toEqual(f.tree);
  expect(expanded.branches[1]!.ending.kind).toBe('open');
});

test('unsafe retained graphs and formula/resource overflows fail without deleting the existing draft', () => {
  const f = fixture();
  const unsafe = { ...f.tree, rootBranchId: null };
  expect(editableTree(unsafe)).toBeNull();
  expect(undoTruthTreeExpansion(unsafe)).toBeNull();
  expect(() =>
    appendTruthTreeExpansion(f.tree, f.root, f.source, 'double_negation', [['P'.repeat(257)]]),
  ).toThrow(/limits/);
  expect(() => initialTruthTree({ ...f.statement, conclusion: 'P'.repeat(256) })).toThrow(/limits/);
  expect(f.tree.expansions).toEqual([]);
});
