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

/** Exact dependency JSON used by private references and staged student answer types. */
export type DependencyProof = {
  proofVersion: 1;
  format: 'dependency';
  steps: DependencyProofStep[];
};
