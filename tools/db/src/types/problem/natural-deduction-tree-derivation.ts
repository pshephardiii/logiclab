import type { ProblemType } from './enums.ts';
import type { NaturalDeductionTreeProof } from '../proof/natural-deduction-tree-work.ts';

/** Private tree JSON stored in owner drafts and immutable published versions. */
export type NaturalDeductionTreeDerivationDefinition = {
  type: `${ProblemType.Derivation}`;
  definitionVersion: 1;
  format: 'tree';
  ruleCatalogVersion: 1;
  checkerVersion: 1;
  premises: { id: string; formula: string }[];
  conclusion: string;
  rules: { id: string; label: string }[];
  referenceProof: NaturalDeductionTreeProof | null;
  explanation?: string | null;
};
