import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import type { LibraryProblemDraft } from '@logiclab/contracts/problem-library';

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
