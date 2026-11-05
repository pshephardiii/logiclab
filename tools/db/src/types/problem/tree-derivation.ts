import type { ProblemType } from './enums.ts';
import type { TreeProof } from '../proof/tree-work.ts';

/** Staged private reference JSON; this type alone does not widen the live entity union. */
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
