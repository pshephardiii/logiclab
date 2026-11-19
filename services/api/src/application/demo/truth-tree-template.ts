import type { TruthTreeDefinition } from '@logiclab/contracts/truth-tree-authoring';

// Identities belong to each pinned tree, independently from global problem/assignment rows.
const premise = 'a1111111-1111-4111-8111-111111111111';
const secondPremise = 'a2222222-2222-4222-8222-222222222222';
const root = 'b1111111-1111-4111-8111-111111111111';
const left = 'b2222222-2222-4222-8222-222222222222';
const right = 'b3333333-3333-4333-8333-333333333333';
const disjunction = 'c1111111-1111-4111-8111-111111111111';
const notP = 'c2222222-2222-4222-8222-222222222222';
const notQ = 'c3333333-3333-4333-8333-333333333333';
const p = 'c4444444-4444-4444-8444-444444444444';
const q = 'c5555555-5555-4555-8555-555555555555';
const expansion = 'd1111111-1111-4111-8111-111111111111';

export const DEMO_TRUTH_TREES: {
  title: string;
  instructions: string;
  definition: TruthTreeDefinition;
}[] = [
  {
    title: 'Truth tree: disjunctive syllogism',
    instructions:
      'Test the argument P ∨ Q, ¬P ∴ Q. Start with both premises and ¬Q. Expand the disjunction on separate branches, then explicitly close each contradictory path.',
    definition: {
      type: 'truth_tree',
      definitionVersion: 1,
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      premises: [
        { id: premise, formula: 'P ∨ Q' },
        { id: secondPremise, formula: '¬P' },
      ],
      conclusion: 'Q',
      explanation:
        'The P branch contradicts premise ¬P. The Q branch contradicts the negated conclusion ¬Q. Both paths close, so the argument is valid.',
      referenceTree: {
        treeVersion: 1,
        format: 'truth_tree',
        rootBranchId: root,
        occurrences: [
          { id: disjunction, formula: 'P ∨ Q', origin: { kind: 'premise', premiseId: premise } },
          { id: notP, formula: '¬P', origin: { kind: 'premise', premiseId: secondPremise } },
          { id: notQ, formula: '¬Q', origin: { kind: 'negated_conclusion' } },
          { id: p, formula: 'P', origin: { kind: 'expansion', expansionId: expansion } },
          { id: q, formula: 'Q', origin: { kind: 'expansion', expansionId: expansion } },
        ],
        branches: [
          {
            id: root,
            parentId: null,
            occurrenceIds: [disjunction, notP, notQ],
            ending: { kind: 'split', expansionId: expansion, childBranchIds: [left, right] },
          },
          {
            id: left,
            parentId: root,
            occurrenceIds: [p],
            ending: { kind: 'closed', closure: { kind: 'complement', occurrenceIds: [notP, p] } },
          },
          {
            id: right,
            parentId: root,
            occurrenceIds: [q],
            ending: { kind: 'closed', closure: { kind: 'complement', occurrenceIds: [notQ, q] } },
          },
        ],
        expansions: [
          {
            id: expansion,
            branchId: root,
            sourceId: disjunction,
            ruleId: 'disjunction',
            resultGroups: [
              { branchId: left, occurrenceIds: [p] },
              { branchId: right, occurrenceIds: [q] },
            ],
          },
        ],
      },
    },
  },
  {
    title: 'Truth tree: an open counterexample',
    instructions:
      'Test the argument P ∨ Q ∴ P. Start with the premise and ¬P. Expand the disjunction and explicitly close contradictory paths. A fully expanded open path can refute the argument.',
    definition: {
      type: 'truth_tree',
      definitionVersion: 1,
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      premises: [{ id: premise, formula: 'P ∨ Q' }],
      conclusion: 'P',
      explanation:
        'The P branch closes against ¬P. The Q branch stays open and complete. P = F and Q = T makes the premise true and conclusion false, so the argument is invalid.',
      referenceTree: {
        treeVersion: 1,
        format: 'truth_tree',
        rootBranchId: root,
        occurrences: [
          { id: disjunction, formula: 'P ∨ Q', origin: { kind: 'premise', premiseId: premise } },
          { id: notP, formula: '¬P', origin: { kind: 'negated_conclusion' } },
          { id: p, formula: 'P', origin: { kind: 'expansion', expansionId: expansion } },
          { id: q, formula: 'Q', origin: { kind: 'expansion', expansionId: expansion } },
        ],
        branches: [
          {
            id: root,
            parentId: null,
            occurrenceIds: [disjunction, notP],
            ending: { kind: 'split', expansionId: expansion, childBranchIds: [left, right] },
          },
          {
            id: left,
            parentId: root,
            occurrenceIds: [p],
            ending: { kind: 'closed', closure: { kind: 'complement', occurrenceIds: [notP, p] } },
          },
          { id: right, parentId: root, occurrenceIds: [q], ending: { kind: 'open' } },
        ],
        expansions: [
          {
            id: expansion,
            branchId: root,
            sourceId: disjunction,
            ruleId: 'disjunction',
            resultGroups: [
              { branchId: left, occurrenceIds: [p] },
              { branchId: right, occurrenceIds: [q] },
            ],
          },
        ],
      },
    },
  },
];
