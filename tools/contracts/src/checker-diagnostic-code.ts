/** Stable wire codes shared by proof/tree checkers; each report schema admits its own subset. */
export const CheckerDiagnosticCode = {
  UnsupportedVersion: 'UNSUPPORTED_VERSION',
  ResourceLimit: 'RESOURCE_LIMIT',
  InvalidStructure: 'INVALID_STRUCTURE',
  InvalidFormula: 'INVALID_FORMULA',
  UnknownRule: 'UNKNOWN_RULE',
  RuleDisabled: 'RULE_DISABLED',
  InvalidReference: 'INVALID_REFERENCE',
  RuleMismatch: 'RULE_MISMATCH',
  InvalidDependency: 'INVALID_DEPENDENCY',
  IncompleteProof: 'INCOMPLETE_PROOF',
  TargetNotEstablished: 'TARGET_NOT_ESTABLISHED',
  IncompleteTree: 'INCOMPLETE_TREE',
  InvalidProblem: 'INVALID_PROBLEM',
  InitialMismatch: 'INITIAL_MISMATCH',
  InvalidClosure: 'INVALID_CLOSURE',
  VerificationFailed: 'VERIFICATION_FAILED',
} as const;

export type CheckerDiagnosticCode =
  (typeof CheckerDiagnosticCode)[keyof typeof CheckerDiagnosticCode];
