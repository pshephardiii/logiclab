/** Retained version-1 checker evidence; runtime consistency is validated by contracts/application. */
export type ProofDiagnosticCode =
  | 'UNSUPPORTED_VERSION'
  | 'RESOURCE_LIMIT'
  | 'INVALID_STRUCTURE'
  | 'INVALID_FORMULA'
  | 'UNKNOWN_RULE'
  | 'RULE_DISABLED'
  | 'INVALID_REFERENCE'
  | 'RULE_MISMATCH'
  | 'INVALID_DEPENDENCY'
  | 'INCOMPLETE_PROOF'
  | 'TARGET_NOT_ESTABLISHED';
export interface ProofCheckReport {
  checkerVersion: 1;
  ruleCatalogVersion: 1;
  status: 'accepted' | 'needs_review' | 'unassessable';
  target: 'established' | 'not_established' | 'unknown';
  steps: {
    stepId: string;
    stepIndex: number;
    localStatus: 'valid' | 'invalid' | 'unassessable';
    dependencyStatus: 'valid' | 'invalid' | 'unknown';
  }[];
  diagnostics: {
    code: ProofDiagnosticCode;
    message: string;
    stepIndex?: number;
    blockId?: string;
    position?: number;
  }[];
}
