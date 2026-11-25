import { ProblemType } from '@logiclab/contracts/problem-type';
import type { TruthTree } from '@logiclab/contracts/truth-tree';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import { TruthTreeVerdict } from '@logiclab/contracts/truth-tree-work';
import { sampleId, sampleStage } from './stage';

/** Public valid/invalid examples differ only in whether P is supplied as a second premise. */
export function createTruthTreeSample(verdict: TruthTreeVerdict = TruthTreeVerdict.Valid) {
  const valid = verdict === TruthTreeVerdict.Valid;
  const statement: TruthTreeContent = {
    type: ProblemType.TruthTree,
    definitionVersion: 1,
    checkerVersion: 1,
    ruleCatalogVersion: 2,
    formulaGroupingVersion: 1,
    premises: [
      { id: sampleId(101), formula: 'P → Q' },
      ...(valid ? [{ id: sampleId(102), formula: 'P' }] : []),
    ],
    conclusion: 'Q',
  };
  const tree: TruthTree = {
    treeVersion: 2,
    format: 'truth_tree',
    rootBranchId: sampleId(110),
    occurrences: [
      {
        id: sampleId(111),
        formula: 'P → Q',
        origin: { kind: 'premise', premiseId: sampleId(101) },
      },
      ...(valid
        ? [
            {
              id: sampleId(112),
              formula: 'P',
              origin: { kind: 'premise' as const, premiseId: sampleId(102) },
            },
          ]
        : []),
      { id: sampleId(113), formula: '¬Q', origin: { kind: 'negated_conclusion' } },
    ],
    branches: [
      {
        id: sampleId(110),
        parentId: null,
        occurrenceIds: [sampleId(111), ...(valid ? [sampleId(112)] : []), sampleId(113)],
        ending: { kind: 'open' },
      },
    ],
    expansions: [],
  };
  const stages = [
    sampleStage(
      'Start with the premises and the negated conclusion, ¬Q. Can they all be true together?',
      tree,
    ),
  ];

  tree.occurrences.push(
    { id: sampleId(121), formula: '¬P', origin: { kind: 'expansion', expansionId: sampleId(120) } },
    { id: sampleId(122), formula: 'Q', origin: { kind: 'expansion', expansionId: sampleId(120) } },
  );
  tree.expansions.push({
    id: sampleId(120),
    branchId: sampleId(110),
    sourceId: sampleId(111),
    ruleId: 'conditional',
    resultGroups: [
      { branchId: sampleId(131), occurrenceIds: [sampleId(121)] },
      { branchId: sampleId(132), occurrenceIds: [sampleId(122)] },
    ],
  });
  tree.branches[0]!.ending = {
    kind: 'split',
    expansionId: sampleId(120),
    childBranchIds: [sampleId(131), sampleId(132)],
  };
  tree.branches.push(
    {
      id: sampleId(131),
      parentId: sampleId(110),
      occurrenceIds: [sampleId(121)],
      ending: { kind: 'open' },
    },
    {
      id: sampleId(132),
      parentId: sampleId(110),
      occurrenceIds: [sampleId(122)],
      ending: { kind: 'open' },
    },
  );
  stages.push(
    sampleStage('P → Q branches into two possibilities: ¬P on the left, or Q on the right.', tree),
  );

  tree.branches[2]!.ending = {
    kind: 'closed',
    closure: { kind: 'complement', occurrenceIds: [sampleId(113), sampleId(122)] },
  };
  stages.push(sampleStage('Close the right path: Q and ¬Q cannot both be true.', tree));

  if (valid) {
    tree.branches[1]!.ending = {
      kind: 'closed',
      closure: { kind: 'complement', occurrenceIds: [sampleId(112), sampleId(121)] },
    };
  }
  stages.push(
    sampleStage(
      valid
        ? 'Close the left path with P and ¬P. Every path closes, so the argument is valid.'
        : 'The fully decomposed left path stays open: P and Q can both be false. The premise is true while the conclusion is false, so the argument is invalid.',
      tree,
    ),
  );

  return {
    id: valid ? 'rain-valid-tree' : 'rain-invalid-tree',
    title: valid
      ? 'Rain implies wet ground; it is raining'
      : 'Does rain implying wet ground guarantee wet ground?',
    introduction:
      'Let P mean “it is raining” and Q mean “the ground is wet”. A truth tree tests whether the premises can be true while the conclusion is false.',
    statement,
    verdict,
    stages,
    completed: structuredClone(tree),
  };
}
