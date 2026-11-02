import type { ProblemType } from './enums.ts';

import type { FitchProof, FitchProofStep } from '../proof/work.ts';

export type DerivationProofStep = FitchProofStep;
export type DerivationReferenceProof = FitchProof;

/** Versioned instructor JSON, shared by mutable drafts and immutable published snapshots. */
export type DerivationDefinition = {
  type: `${ProblemType.Derivation}`;
  definitionVersion: 1;
  format: 'fitch';
  ruleCatalogVersion: 1;
  checkerVersion: 1;
  premises: { id: string; formula: string }[];
  conclusion: string;
  rules: { id: string; label: string }[];
  referenceProof: DerivationReferenceProof | null;
  explanation?: string | null;
};
