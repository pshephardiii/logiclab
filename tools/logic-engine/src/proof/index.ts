export { sameFormula } from './formula-equality';
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
