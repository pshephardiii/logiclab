export { sameFormula } from './formula-equality';

export { checkFitchProof } from './fitch/check-proof';

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

export { isFinishedFitchProofAttempt, isFinishedDependencyProofAttempt } from './completion';

export { inferenceDependencyIds, dependencySetsMatch } from './dependency/sets';

export type { DischargedDependencySet } from './dependency/sets';

export { analyzeDependencyStructure } from './dependency/structure';

export type { DependencyStructureResult, DependencyReferences } from './dependency/structure';

export { checkDependencyProof } from './dependency/check-proof';

export { checkNaturalDeductionTreeProof } from './natural-deduction-tree/check-proof';

export { analyzeNaturalDeductionTreeStructure } from './natural-deduction-tree/structure';

export type {
  NaturalDeductionTreeReferences,
  NaturalDeductionTreeStructureResult,
} from './natural-deduction-tree/structure';

export { isFinishedNaturalDeductionTreeProofAttempt } from './natural-deduction-tree/completeness';
