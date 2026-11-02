export type FitchProofStep =
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

/** Bounded proof JSON shared by private references and student-entered work. */
export type FitchProof = {
  proofVersion: 1;
  format: 'fitch';
  steps: FitchProofStep[];
  blocks: { id: string; parentId: string | null; assumptionId: string; endId: string | null }[];
};
