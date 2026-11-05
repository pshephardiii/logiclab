/** Exact flat tree JSON. Runtime contracts/checkers own bounds, structure and correctness. */
export type TreeProofBranch = {
  rootId: string | null;
  assumptionFormula: string;
  assumptionIds: string[];
};

export type TreeProofNode =
  | { kind: 'premise'; id: string; formula: string; premiseId: string | null }
  | { kind: 'assumption'; id: string; formula: string }
  | {
      kind: 'inference';
      id: string;
      formula: string;
      ruleId: string | null;
      lineReferences: string[];
      branches: TreeProofBranch[];
    };

export type TreeProof = {
  proofVersion: 1;
  format: 'tree';
  rootId: string | null;
  nodes: TreeProofNode[];
};
