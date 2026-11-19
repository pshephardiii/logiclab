/** Exact retained checker JSON; runtime contracts validate evidence consistency. */
export interface TruthTreeDiagnostic {
  code:
    | 'UNSUPPORTED_VERSION'
    | 'RESOURCE_LIMIT'
    | 'INVALID_STRUCTURE'
    | 'INVALID_REFERENCE'
    | 'INCOMPLETE_TREE'
    | 'INVALID_PROBLEM'
    | 'INVALID_FORMULA'
    | 'INITIAL_MISMATCH'
    | 'UNKNOWN_RULE'
    | 'RULE_MISMATCH'
    | 'INVALID_CLOSURE'
    | 'VERIFICATION_FAILED';
  message: string;
  branchId?: string;
  occurrenceId?: string;
  expansionId?: string;
}

export interface TruthTreeCheckReport {
  checkerVersion: 1;
  ruleCatalogVersion: 1;
  status: 'verified' | 'incomplete' | 'invalid' | 'unassessable';
  argumentStatus: 'valid' | 'invalid' | 'undetermined';
  steps: {
    checkerVersion: 1;
    ruleCatalogVersion: 1;
    status: 'checked' | 'incomplete' | 'invalid' | 'unassessable';
    initial: 'valid' | 'invalid' | 'unknown';
    occurrences: { occurrenceId: string; status: 'valid' | 'invalid' | 'incomplete' }[];
    expansions: { expansionId: string; status: 'valid' | 'invalid' | 'unknown' }[];
    closures: { branchId: string; status: 'valid' | 'invalid' | 'unknown' }[];
    diagnostics: TruthTreeDiagnostic[];
  };
  branches: {
    branchId: string;
    status: 'closed' | 'open_complete' | 'incomplete' | 'needs_closure';
    unexpandedOccurrenceIds: string[];
  }[];
  counterexample: { branchId: string; assignment: Record<string, boolean> } | null;
  diagnostics: TruthTreeDiagnostic[];
}
