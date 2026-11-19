import type { TruthTreeDefinition } from '@logiclab/contracts/truth-tree-authoring';

export const truthTreeIds = {
  premise: 'a1111111-1111-4111-8111-111111111111',
  root: 'b2222222-2222-4222-8222-222222222222',
  premiseOccurrence: 'c3333333-3333-4333-8333-333333333333',
  conclusionOccurrence: 'd4444444-4444-4444-8444-444444444444',
};

export function truthTreeDefinitionFixture(
  outcome: 'valid' | 'invalid' = 'valid',
): TruthTreeDefinition {
  const { premise, root, premiseOccurrence, conclusionOccurrence } = truthTreeIds;
  const conclusion = outcome === 'valid' ? 'P' : 'Q';
  return {
    type: 'truth_tree',
    definitionVersion: 1,
    checkerVersion: 1,
    ruleCatalogVersion: 1,
    premises: [{ id: premise, formula: 'P' }],
    conclusion,
    explanation: 'PRIVATE_TRUTH_TREE_EXPLANATION',
    referenceTree: {
      treeVersion: 1,
      format: 'truth_tree',
      rootBranchId: root,
      occurrences: [
        { id: premiseOccurrence, formula: 'P', origin: { kind: 'premise', premiseId: premise } },
        {
          id: conclusionOccurrence,
          formula: `!${conclusion}`,
          origin: { kind: 'negated_conclusion' },
        },
      ],
      expansions: [],
      branches: [
        {
          id: root,
          parentId: null,
          occurrenceIds: [premiseOccurrence, conclusionOccurrence],
          ending:
            outcome === 'valid'
              ? {
                  kind: 'closed',
                  closure: {
                    kind: 'complement',
                    occurrenceIds: [premiseOccurrence, conclusionOccurrence],
                  },
                }
              : { kind: 'open' },
        },
      ],
    },
  };
}
