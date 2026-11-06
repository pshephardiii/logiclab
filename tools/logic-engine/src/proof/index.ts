export { sameFormula } from './formula-equality';
export { checkProof } from './fitch/check-proof';
export { PROOF_CHECKER_VERSION } from './report';
export { analyzeFitchStructure } from './fitch/structure';
export type {
  FitchStructureResult,
  FitchReferenceCheck,
  FitchBlockSpan,
  ClosedFitchBlockSpan,
} from './fitch/types';
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
export { isFinishedProofAttempt, isFinishedDependencyProofAttempt } from './completion';
export { inferenceDependencyIds, dependencySetsMatch } from './dependency/sets';
export type { DischargedDependencySet } from './dependency/sets';
export { analyzeDependencyStructure } from './dependency/structure';
export type { DependencyStructureResult, DependencyReferences } from './dependency/structure';
export { checkDependencyProof } from './dependency/check-proof';
export { checkTreeProof } from './tree/check-proof';
export { analyzeTreeStructure } from './tree/structure';
export type { TreeReferences, TreeStructureResult } from './tree/structure';
export { isFinishedTreeProofAttempt } from './tree/completeness';
