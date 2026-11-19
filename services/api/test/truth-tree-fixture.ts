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

/** One complete counterexample path suffices to refute, while the sibling remains unfinished. */
export function truthTreeShortCounterexampleFixture(): TruthTreeDefinition {
  const definition = truthTreeDefinitionFixture('invalid');
  definition.premises[0]!.formula = 'P v (Q & R)';
  definition.conclusion = 'S';
  const tree = definition.referenceTree!;
  tree.occurrences[0]!.formula = definition.premises[0]!.formula;
  tree.occurrences[1]!.formula = '!S';
  const expansionId = 'e5555555-5555-4555-8555-555555555555';
  const left = 'f6666666-6666-4666-8666-666666666666';
  const right = '07777777-7777-4777-8777-777777777777';
  const leftOccurrence = '18888888-8888-4888-8888-888888888888';
  const rightOccurrence = '29999999-9999-4999-8999-999999999999';
  tree.occurrences.push(
    { id: leftOccurrence, formula: 'P', origin: { kind: 'expansion', expansionId } },
    { id: rightOccurrence, formula: 'Q & R', origin: { kind: 'expansion', expansionId } },
  );
  tree.branches[0]!.ending = { kind: 'split', expansionId, childBranchIds: [left, right] };
  tree.branches.push(
    {
      id: left,
      parentId: truthTreeIds.root,
      occurrenceIds: [leftOccurrence],
      ending: { kind: 'open' },
    },
    {
      id: right,
      parentId: truthTreeIds.root,
      occurrenceIds: [rightOccurrence],
      ending: { kind: 'open' },
    },
  );
  tree.expansions.push({
    id: expansionId,
    branchId: truthTreeIds.root,
    sourceId: truthTreeIds.premiseOccurrence,
    ruleId: 'disjunction',
    resultGroups: [
      { branchId: left, occurrenceIds: [leftOccurrence] },
      { branchId: right, occurrenceIds: [rightOccurrence] },
    ],
  });
  return definition;
}
