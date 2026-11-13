import { truthTreeDiagnosticSchema, type TruthTree } from '@logiclab/contracts/truth-tree';
import { analyzeTruthTreeStructure } from '../../src/truth-tree';

export const id = (value: number) =>
  `${value.toString(16).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;

export const ids = {
  root: id(1),
  left: id(2),
  right: id(3),
  premise: id(4),
  conclusion: id(5),
  p: id(6),
  q: id(7),
  expansion: id(8),
};

export function splitTree(): TruthTree {
  const { root, left, right, premise, conclusion, p, q, expansion } = ids;
  return {
    treeVersion: 1,
    format: 'truth_tree',
    rootBranchId: root,
    occurrences: [
      { id: premise, formula: 'P v Q', origin: { kind: 'premise', premiseId: id(900) } },
      { id: conclusion, formula: '!P', origin: { kind: 'negated_conclusion' } },
      { id: p, formula: 'P', origin: { kind: 'expansion', expansionId: expansion } },
      { id: q, formula: 'Q', origin: { kind: 'expansion', expansionId: expansion } },
    ],
    branches: [
      {
        id: root,
        parentId: null,
        occurrenceIds: [premise, conclusion],
        ending: { kind: 'split', expansionId: expansion, childBranchIds: [left, right] },
      },
      {
        id: left,
        parentId: root,
        occurrenceIds: [p],
        ending: { kind: 'closed', closure: { kind: 'complement', occurrenceIds: [p, conclusion] } },
      },
      { id: right, parentId: root, occurrenceIds: [q], ending: { kind: 'open' } },
    ],
    expansions: [
      {
        id: expansion,
        branchId: root,
        sourceId: premise,
        ruleId: 'disjunction',
        resultGroups: [
          { branchId: left, occurrenceIds: [p] },
          { branchId: right, occurrenceIds: [q] },
        ],
      },
    ],
  };
}

export function linearTree(): TruthTree {
  const tree = splitTree();
  tree.occurrences[0]!.formula = 'P & Q';
  tree.branches = [
    {
      id: ids.root,
      parentId: null,
      occurrenceIds: [ids.premise, ids.conclusion, ids.p, ids.q],
      ending: { kind: 'open' },
    },
  ];
  tree.expansions[0] = {
    id: ids.expansion,
    branchId: ids.root,
    sourceId: ids.premise,
    ruleId: 'conjunction',
    resultGroups: [{ branchId: ids.root, occurrenceIds: [ids.p, ids.q] }],
  };
  return tree;
}

export function expectStatus(
  tree: unknown,
  status: 'resolved' | 'invalid' | 'incomplete' | 'unassessable',
) {
  const result = analyzeTruthTreeStructure(tree);
  expect(result.status).toBe(status);
  for (const diagnostic of result.diagnostics)
    expect(truthTreeDiagnosticSchema.safeParse(diagnostic).success).toBe(true);
  if (status !== 'resolved') expect(result).not.toHaveProperty('structure');
  return result;
}
