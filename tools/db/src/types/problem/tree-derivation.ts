import type { ProblemType } from './enums.ts';
import type { TreeProof } from '../proof/tree-work.ts';

/** Private tree JSON stored in owner drafts and immutable published versions. */
export type TreeDerivationDefinition = {
  type: `${ProblemType.Derivation}`;
  definitionVersion: 1;
  format: 'tree';
  ruleCatalogVersion: 1;
  checkerVersion: 1;
  premises: { id: string; formula: string }[];
  conclusion: string;
  rules: { id: string; label: string }[];
  referenceProof: TreeProof | null;
  explanation?: string | null;
};
