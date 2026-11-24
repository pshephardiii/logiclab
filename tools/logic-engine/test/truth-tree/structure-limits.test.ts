import { TRUTH_TREE_LIMITS, type TruthTree } from '@logiclab/contracts/truth-tree';
import { analyzeTruthTreeStructure } from '../../src/truth-tree';
import { truthTreeBudget } from '../../src/truth-tree/structure-context';
import { expectStatus, id, ids, splitTree } from './structure-fixture';

test.each([
  null,
  [],
  {},
  { ...splitTree(), rootBranchId: 'invalid' },
  { ...splitTree(), trusted: true },
])('malformed raw transport is unassessable without exposing reference maps: %#', (input) => {
  expectStatus(input, 'unassessable');
});

test.each([
  { ...splitTree(), treeVersion: 3 },
  { ...splitTree(), format: 'tree' },
])('unsupported methods/versions do not reach graph checking: %#', (input) => {
  const result = expectStatus(input, 'unassessable');
  expect(result.diagnostics[0]!.code).toBe('UNSUPPORTED_VERSION');
});

test.each([
  { ...splitTree(), branches: Array(128).fill(null) },
  { ...splitTree(), occurrences: Array(201).fill(null) },
  { ...splitTree(), expansions: Array(201).fill(null) },
  { ...splitTree(), occurrences: [{ formula: 'P'.repeat(257) }] },
  { ...splitTree(), branches: [{ occurrenceIds: Array(201).fill(null) }] },
  {
    ...splitTree(),
    branches: [{ occurrenceIds: Array(101).fill(null) }, { occurrenceIds: Array(100).fill(null) }],
  },
  { ...splitTree(), branches: [{ ending: { childBranchIds: Array(3).fill(null) } }] },
  { ...splitTree(), branches: [{ ending: { closure: { occurrenceIds: Array(3).fill(null) } } }] },
  { ...splitTree(), expansions: [{ resultGroups: Array(3).fill(null) }] },
  { ...splitTree(), expansions: [{ resultGroups: [{ occurrenceIds: Array(3).fill(null) }] }] },
])('raw collection limits are checked before transport element validation: %#', (input) => {
  const result = expectStatus(input, 'unassessable');
  expect(result.diagnostics[0]!.code).toBe('RESOURCE_LIMIT');
});

function partialChain(depth: number): TruthTree {
  return {
    treeVersion: 1,
    format: 'truth_tree',
    rootBranchId: id(1),
    occurrences: [],
    expansions: [],
    branches: Array.from({ length: depth + 1 }, (_, index) => ({
      id: id(index + 1),
      parentId: index === 0 ? null : id(index),
      occurrenceIds: [],
      ending:
        index === depth
          ? { kind: 'open' }
          : { kind: 'split', expansionId: null, childBranchIds: [id(index + 2)] },
    })),
  };
}

test('iterative traversal permits the nesting boundary and refuses one level beyond it', () => {
  expectStatus(partialChain(TRUTH_TREE_LIMITS.maxBranchDepth), 'incomplete');
  const result = expectStatus(partialChain(TRUTH_TREE_LIMITS.maxBranchDepth + 1), 'unassessable');
  expect(result.diagnostics[0]!.code).toBe('RESOURCE_LIMIT');
});

test('exhausted shared checking budget cannot return a partial resolved structure', () => {
  const budget = truthTreeBudget();
  budget.spend(TRUTH_TREE_LIMITS.maxCheckWork);
  const result = analyzeTruthTreeStructure(splitTree(), budget);
  expect(result.status).toBe('unassessable');
  expect(result.diagnostics[0]!.code).toBe('RESOURCE_LIMIT');
  expect(result).not.toHaveProperty('structure');
});

test('diagnostic overflow becomes an explicit resource failure rather than silently truncating evidence', () => {
  const input: TruthTree = {
    treeVersion: 1,
    format: 'truth_tree',
    rootBranchId: ids.root,
    expansions: [],
    occurrences: Array.from({ length: 200 }, (_, index) => ({
      id: id(index + 20),
      formula: '',
      origin: { kind: 'premise', premiseId: null },
    })),
    branches: [
      {
        id: ids.root,
        parentId: null,
        occurrenceIds: Array.from({ length: 200 }, (_, index) => id(index + 20)),
        ending: { kind: 'closed', closure: null },
      },
    ],
  };
  const result = expectStatus(input, 'unassessable');
  expect(result.diagnostics).toHaveLength(1);
  expect(result.diagnostics[0]!.code).toBe('RESOURCE_LIMIT');
});
