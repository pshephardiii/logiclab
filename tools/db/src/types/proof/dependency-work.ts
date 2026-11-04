export type DependencyProofStep =
  | {
      kind: 'premise';
      id: string;
      formula: string;
      dependencies: string[];
      premiseId: string | null;
    }
  | { kind: 'assumption'; id: string; formula: string; dependencies: string[] }
  | {
      kind: 'inference';
      id: string;
      formula: string;
      dependencies: string[];
      ruleId: string | null;
      lineReferences: string[];
      discharges: { assumptionId: string | null; conclusionId: string | null }[];
    };

/** Staged exact JSON reference type, not admission into persisted problem/answer unions. */
export type DependencyProof = {
  proofVersion: 1;
  format: 'dependency';
  steps: DependencyProofStep[];
};
