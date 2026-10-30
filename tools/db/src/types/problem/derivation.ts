import type { ProblemType } from './enums.ts';

export type DerivationProofStep =
  | { kind: 'premise'; id: string; blockId: null; formula: string; premiseId: string | null }
  | { kind: 'assumption'; id: string; blockId: string; formula: string }
  | {
      kind: 'inference';
      id: string;
      blockId: string | null;
      formula: string;
      ruleId: string | null;
      lineReferences: string[];
      subproofReferences: string[];
    };

/** Private saved reference work; publication validation belongs to the application workflow. */
export type DerivationReferenceProof = {
  proofVersion: 1;
  format: 'fitch';
  steps: DerivationProofStep[];
  blocks: { id: string; parentId: string | null; assumptionId: string; endId: string | null }[];
};

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
