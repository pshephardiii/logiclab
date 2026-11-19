export type TruthTreeOccurrence = {
  id: string;
  formula: string;
  origin:
    | { kind: 'premise'; premiseId: string | null }
    | { kind: 'negated_conclusion' }
    | { kind: 'expansion'; expansionId: string | null };
};

export type TruthTreeClosure =
  | { kind: 'complement'; occurrenceIds: [string, string] }
  | { kind: 'falsity'; occurrenceId: string };

/** Exact JSON reference shape; runtime contracts and the checker establish validity. */
export type TruthTree = {
  treeVersion: 1;
  format: 'truth_tree';
  rootBranchId: string | null;
  occurrences: TruthTreeOccurrence[];
  branches: {
    id: string;
    parentId: string | null;
    occurrenceIds: string[];
    ending:
      | { kind: 'open' }
      | { kind: 'closed'; closure: TruthTreeClosure | null }
      | { kind: 'split'; expansionId: string | null; childBranchIds: string[] };
  }[];
  expansions: {
    id: string;
    branchId: string;
    sourceId: string | null;
    ruleId: string | null;
    resultGroups: { branchId: string; occurrenceIds: string[] }[];
  }[];
};
