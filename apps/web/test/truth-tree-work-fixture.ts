import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import type { TruthTreeAnswer } from '@logiclab/contracts/truth-tree-work';
import type { TruthTreeSolution } from '@logiclab/contracts/truth-tree-authoring';
import { work, itemB } from './assignment-work-fixture';

export const truthTreeAnswer: TruthTreeAnswer = {
  type: 'truth_tree',
  tree: {
    treeVersion: 1,
    format: 'truth_tree',
    rootBranchId: null,
    occurrences: [{ id: itemB, formula: 'R', origin: { kind: 'negated_conclusion' } }],
    branches: [],
    expansions: [],
  },
};

export const truthTreeWork: SavedStudentAssignment = {
  ...work,
  assessmentMode: 'ungraded_practice',
  feedbackTiming: 'immediate',
  solutionAccess: 'anytime',
  items: [
    work.items[0]!,
    {
      id: itemB,
      position: 2,
      title: 'Truth-tree occurrence',
      instructions: null,
      content: {
        type: 'truth_tree',
        definitionVersion: 1,
        checkerVersion: 1,
        ruleCatalogVersion: 1,
        premises: [],
        conclusion: 'P',
      },
    },
  ],
};

export const truthTreeSolution: TruthTreeSolution = {
  type: 'truth_tree',
  definitionVersion: 1,
  checkerVersion: 1,
  ruleCatalogVersion: 1,
  referenceTree: { ...truthTreeAnswer.tree, occurrences: [] },
  argumentStatus: 'valid',
  counterexample: null,
  explanation: 'PRIVATE_REFERENCE_EXPLANATION',
};
