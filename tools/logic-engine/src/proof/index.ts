export { sameFormula } from './formula-equality';
export { checkProof, PROOF_CHECKER_VERSION } from './check-proof';
export { analyzeFitchStructure } from './fitch-structure';
export type {
  FitchStructureResult,
  FitchReferenceCheck,
  FitchBlockSpan,
  ClosedFitchBlockSpan,
} from './fitch-types';
export { checkLocalRule } from './local-rule';
export type { LocalRuleApplication, LocalRuleResult } from './local-rule';
export type { LocalSubproof } from './types';
export { parseProofFormula, PROOF_FORMULA_LIMITS } from './parse-formula';
export type { ProofFormula } from './types';
export {
  PROPOSITIONAL_RULE_CATALOG_VERSION,
  PROPOSITIONAL_RULE_CATALOG,
  getPropositionalRule,
} from './rule-catalog';
export type { PropositionalRuleId, PropositionalRule } from './rule-catalog';
export { isFinishedProofAttempt } from './attempt-completeness';
export { inferenceDependencyIds, dependencySetsMatch } from './dependency-sets';
export type { DischargedDependencySet } from './dependency-sets';
export { analyzeDependencyStructure } from './dependency-structure';
export type { DependencyStructureResult, DependencyReferences } from './dependency-structure';
export { checkDependencyProof } from './check-dependency-proof';
