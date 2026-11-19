import type { TruthTreeDefinition } from '@logiclab/contracts/truth-tree-authoring';
import { derivationDraft } from './derivation';

export const truthTreeDefinition: TruthTreeDefinition = {
  type: 'truth_tree',
  definitionVersion: 1,
  checkerVersion: 1,
  ruleCatalogVersion: 1,
  premises: [{ id: 'a1111111-1111-4111-8111-111111111111', formula: 'P' }],
  conclusion: 'Q',
  referenceTree: null,
  explanation: 'PRIVATE_TREE_EXPLANATION',
};

export const truthTreeDraft = {
  ...derivationDraft,
  title: 'Truth-tree argument',
  definition: truthTreeDefinition,
};
