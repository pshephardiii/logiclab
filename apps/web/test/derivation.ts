import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import type { LibraryProblemDraft } from '@logiclab/contracts/problem-library';
import type { TreeDerivationDefinition } from '@logiclab/contracts/tree-derivation';

export const treeDerivationDefinition: TreeDerivationDefinition = {
  type: 'derivation',
  definitionVersion: 1,
  format: 'tree',
  ruleCatalogVersion: 1,
  checkerVersion: 1,
  premises: [],
  conclusion: 'P -> P',
  rules: [{ id: 'implication_introduction', label: 'Conditional proof' }],
  explanation: 'Private tree explanation',
  referenceProof: {
    proofVersion: 1,
    format: 'tree',
    rootId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    nodes: [
      { kind: 'assumption', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', formula: 'P' },
      {
        kind: 'inference',
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        formula: 'P -> P',
        ruleId: 'implication_introduction',
        lineReferences: [],
        branches: [
          {
            rootId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            assumptionFormula: 'P',
            assumptionIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
          },
        ],
      },
    ],
  },
};

export const derivationDefinition: DerivationDefinition = {
  type: 'derivation',
  definitionVersion: 1,
  format: 'fitch',
  ruleCatalogVersion: 1,
  checkerVersion: 1,
  premises: [],
  conclusion: 'P -> P',
  rules: [{ id: 'implication_introduction', label: 'Conditional proof' }],
  referenceProof: null,
  explanation: 'Private instructor explanation',
};
export const derivationDraft = {
  id: '44444444-4444-4444-8444-444444444444',
  title: 'Conditional identity',
  instructions: 'Prove the target',
  definition: derivationDefinition,
  archivedAt: null,
  createdAt: '2026-10-30T12:00:00.000Z',
  updatedAt: '2026-10-30T12:00:00.000Z',
} satisfies LibraryProblemDraft;
