import type { TruthTree } from '@logiclab/contracts/truth-tree';
import { expectStatus, id, ids, linearTree, splitTree } from './structure-fixture';

test('nonbranching outputs can reverse component order while preserving one adjacent insertion', () => {
  const tree = linearTree();
  tree.expansions[0]!.resultGroups[0]!.occurrenceIds.reverse();
  expectStatus(tree, 'resolved');
});

test.each<[string, (tree: TruthTree) => void]>([
  ['unknown expansion branch', (tree) => (tree.expansions[0]!.branchId = id(999))],
  ['unknown source', (tree) => (tree.expansions[0]!.sourceId = id(999))],
  ['descendant source', (tree) => (tree.expansions[0]!.sourceId = ids.p)],
  [
    'unknown split expansion',
    (tree) =>
      (tree.branches[0]!.ending = {
        kind: 'split',
        expansionId: id(999),
        childBranchIds: [ids.left, ids.right],
      }),
  ],
  [
    'same output reused',
    (tree) => (tree.expansions[0]!.resultGroups[0]!.occurrenceIds = [ids.p, ids.p]),
  ],
  ['unrelated output branch', (tree) => (tree.expansions[0]!.resultGroups[0]!.branchId = ids.root)],
  [
    'wrong output membership',
    (tree) => (tree.expansions[0]!.resultGroups[0]!.occurrenceIds = [ids.q]),
  ],
  [
    'initial formula as output',
    (tree) => (tree.expansions[0]!.resultGroups[0]!.occurrenceIds = [ids.premise]),
  ],
  [
    'misattributed origin',
    (tree) => (tree.occurrences[2]!.origin = { kind: 'expansion', expansionId: id(999) }),
  ],
  ['orphaned event results', (tree) => (tree.expansions = [])],
  [
    'sibling closure citation',
    (tree) =>
      (tree.branches[1]!.ending = {
        kind: 'closed',
        closure: { kind: 'complement', occurrenceIds: [ids.p, ids.q] },
      }),
  ],
  [
    'unknown falsity witness',
    (tree) =>
      (tree.branches[1]!.ending = {
        kind: 'closed',
        closure: { kind: 'falsity', occurrenceId: id(999) },
      }),
  ],
  [
    'repeated closure witness',
    (tree) =>
      (tree.branches[1]!.ending = {
        kind: 'closed',
        closure: { kind: 'complement', occurrenceIds: [ids.p, ids.p] },
      }),
  ],
])('%s cannot resolve', (_name, change) => {
  const tree = splitTree();
  change(tree);
  expectStatus(tree, 'invalid');
});

test.each([ids.p, ids.q])('self/forward source %s cannot support its own generation', (source) => {
  const tree = linearTree();
  tree.expansions[0]!.sourceId = source;
  expectStatus(tree, 'invalid');
});

test('an ancestor may be expanded separately on a child, but a sibling occurrence is inaccessible', () => {
  const tree = splitTree();
  tree.occurrences.push({
    id: id(20),
    formula: 'P',
    origin: { kind: 'expansion', expansionId: id(21) },
  });
  tree.branches[1]!.occurrenceIds.push(id(20));
  tree.expansions.push({
    id: id(21),
    branchId: ids.left,
    sourceId: ids.premise,
    ruleId: 'unknown_rule',
    resultGroups: [{ branchId: ids.left, occurrenceIds: [id(20)] }],
  });
  expectStatus(tree, 'resolved');
  tree.expansions[1]!.sourceId = ids.q;
  expectStatus(tree, 'invalid');
});

test('missing rule/source and closure selection are incomplete, not established results', () => {
  const tree = splitTree();
  tree.expansions[0]!.sourceId = null;
  tree.expansions[0]!.ruleId = null;
  tree.branches[1]!.ending = { kind: 'closed', closure: null };
  expectStatus(tree, 'incomplete');
});

test('a split result must start its child, before later independently generated occurrences', () => {
  const tree = splitTree();
  tree.occurrences.push({
    id: id(20),
    formula: 'P',
    origin: { kind: 'expansion', expansionId: id(21) },
  });
  tree.branches[1]!.occurrenceIds.unshift(id(20));
  tree.expansions.push({
    id: id(21),
    branchId: ids.left,
    sourceId: ids.premise,
    ruleId: 'double_negation',
    resultGroups: [{ branchId: ids.left, occurrenceIds: [id(20)] }],
  });
  expectStatus(tree, 'invalid');
});

test('nonbranching output components cannot straddle a separate expansion', () => {
  const tree = linearTree();
  tree.occurrences.push({
    id: id(20),
    formula: 'P',
    origin: { kind: 'expansion', expansionId: id(21) },
  });
  tree.branches[0]!.occurrenceIds.splice(3, 0, id(20));
  tree.expansions.push({
    id: id(21),
    branchId: ids.root,
    sourceId: ids.premise,
    ruleId: 'double_negation',
    resultGroups: [{ branchId: ids.root, occurrenceIds: [id(20)] }],
  });
  expectStatus(tree, 'invalid');
});
