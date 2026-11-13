/** Exact flat tree JSON. Runtime contracts/checkers own bounds, structure and correctness. */
export type NaturalDeductionTreeProofBranch = {
  rootId: string | null;
  assumptionFormula: string;
  assumptionIds: string[];
};

export type NaturalDeductionTreeProofNode =
  | { kind: 'premise'; id: string; formula: string; premiseId: string | null }
  | { kind: 'assumption'; id: string; formula: string }
  | {
      kind: 'inference';
      id: string;
      formula: string;
      ruleId: string | null;
      lineReferences: string[];
      branches: NaturalDeductionTreeProofBranch[];
    };

export type NaturalDeductionTreeProof = {
  proofVersion: 1;
  format: 'tree';
  rootId: string | null;
  nodes: NaturalDeductionTreeProofNode[];
};
