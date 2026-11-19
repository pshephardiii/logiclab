import type { TruthTree } from '@logiclab/contracts/truth-tree';
import { analyzeTruthTreeStructure } from '../../src/truth-tree';
import { expectStatus, id, ids, linearTree, splitTree } from './structure-fixture';

test('resolve ancestor paths without copying formulas or changing the submitted tree', () => {
  const tree = splitTree();
  const before = structuredClone(tree);
  const result = expectStatus(tree, 'resolved');
  if (result.status !== 'resolved') throw Error('Expected structural resolution.');
  expect(result.structure.paths.get(ids.left)).toEqual([ids.premise, ids.conclusion, ids.p]);
  expect(result.structure.paths.get(ids.right)).toEqual([ids.premise, ids.conclusion, ids.q]);
  expect(result.structure.locations.get(ids.p)).toEqual({ branchId: ids.left, index: 0 });
  expect(tree).toEqual(before);
});

test('array storage order and left/right alternative order do not define identity', () => {
  const tree = splitTree();
  tree.branches.reverse();
  tree.occurrences.reverse();
  tree.expansions[0]!.resultGroups.reverse();
  expectStatus(tree, 'resolved');
  const upper = JSON.parse(JSON.stringify(tree).replace(/aaaaaaaa/g, 'AAAAAAAA'));
  expectStatus(upper, 'resolved');
});

test('empty work and a root segment with an unfinished split stay incomplete', () => {
  expectStatus(
    {
      treeVersion: 1,
      format: 'truth_tree',
      rootBranchId: null,
      occurrences: [],
      branches: [],
      expansions: [],
    },
    'incomplete',
  );
  expectStatus(
    {
      treeVersion: 1,
      format: 'truth_tree',
      rootBranchId: ids.root,
      occurrences: [],
      branches: [
        {
          id: ids.root,
          parentId: null,
          occurrenceIds: [],
          ending: { kind: 'split', expansionId: null, childBranchIds: [] },
        },
      ],
      expansions: [],
    },
    'incomplete',
  );
});

test.each<[string, (tree: TruthTree) => void]>([
  ['duplicate occurrence', (tree) => tree.occurrences.push(structuredClone(tree.occurrences[0]!))],
  ['duplicate branch', (tree) => tree.branches.push(structuredClone(tree.branches[1]!))],
  ['duplicate expansion', (tree) => tree.expansions.push(structuredClone(tree.expansions[0]!))],
  ['cross-table identity collision', (tree) => (tree.expansions[0]!.id = ids.root)],
  ['unknown root', (tree) => (tree.rootBranchId = id(999))],
  ['root parent', (tree) => (tree.branches[0]!.parentId = ids.left)],
  ['second root', (tree) => (tree.branches[1]!.parentId = null)],
  ['missing parent', (tree) => (tree.branches[1]!.parentId = id(999))],
  ['wrong reciprocal parent', (tree) => (tree.branches[1]!.parentId = ids.right)],
  [
    'reused split child',
    (tree) =>
      (tree.branches[0]!.ending = {
        kind: 'split',
        expansionId: ids.expansion,
        childBranchIds: [ids.left, ids.left],
      }),
  ],
  [
    'missing split child',
    (tree) =>
      (tree.branches[0]!.ending = {
        kind: 'split',
        expansionId: ids.expansion,
        childBranchIds: [ids.left, id(999)],
      }),
  ],
  ['children under open branch', (tree) => (tree.branches[0]!.ending = { kind: 'open' })],
  ['duplicated membership', (tree) => tree.branches[2]!.occurrenceIds.push(ids.p)],
  ['unknown occurrence', (tree) => tree.branches[0]!.occurrenceIds.push(id(999))],
  ['wrong-kind membership reference', (tree) => tree.branches[0]!.occurrenceIds.push(ids.left)],
  ['unowned occurrence', (tree) => (tree.branches[2]!.occurrenceIds = [])],
  [
    'initial formula outside root',
    (tree) => (tree.occurrences[3]!.origin = { kind: 'negated_conclusion' }),
  ],
])('%s is rejected without exposing resolved maps', (_name, change) => {
  const tree = splitTree();
  change(tree);
  expectStatus(tree, 'invalid');
});

test('an unreachable cyclic component cannot hide outside the root traversal', () => {
  const tree = splitTree();
  tree.branches.push({
    id: id(30),
    parentId: id(30),
    occurrenceIds: [],
    ending: { kind: 'split', expansionId: null, childBranchIds: [id(30)] },
  });
  expectStatus(tree, 'invalid');
});

test('initial formulas cannot be inserted after generated formulas', () => {
  const tree = linearTree();
  tree.branches[0]!.occurrenceIds = [ids.premise, ids.p, ids.conclusion, ids.q];
  expectStatus(tree, 'invalid');
});

test('resolved structure deliberately does not certify formula syntax or closure truth', () => {
  const tree = splitTree();
  tree.occurrences[0]!.formula = 'P &';
  tree.branches[1]!.ending = { kind: 'closed', closure: { kind: 'falsity', occurrenceId: ids.p } };
  expectStatus(tree, 'resolved');
  expect(analyzeTruthTreeStructure(tree)).not.toHaveProperty('argumentStatus');
});
