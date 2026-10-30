import { getPropositionalRule, PROPOSITIONAL_RULE_CATALOG_VERSION } from './rule-catalog';
import { matchesRule } from './rule-patterns';
import type { ProofFormula, LocalSubproof } from './types';

export type LocalRuleApplication = {
  ruleCatalogVersion: number;
  ruleId: string | null;
  permittedRuleIds: readonly string[];
  conclusion: ProofFormula;
  lines: readonly ProofFormula[];
  subproofs: readonly LocalSubproof[];
};

export type LocalRuleResult =
  | { status: 'valid' }
  | {
      status: 'invalid';
      code: 'UNKNOWN_RULE' | 'RULE_DISABLED' | 'INVALID_REFERENCE' | 'RULE_MISMATCH';
    }
  | { status: 'unassessable'; code: 'UNSUPPORTED_VERSION' | 'INCOMPLETE_PROOF' };

/** Check a local inference over trusted parsed formulas and already resolved citations. */
export function checkLocalRule(application: LocalRuleApplication): LocalRuleResult {
  if (application.ruleCatalogVersion !== PROPOSITIONAL_RULE_CATALOG_VERSION)
    return { status: 'unassessable', code: 'UNSUPPORTED_VERSION' };
  if (application.ruleId === null) return { status: 'unassessable', code: 'INCOMPLETE_PROOF' };
  const rule = getPropositionalRule(application.ruleId);
  if (!rule) return { status: 'invalid', code: 'UNKNOWN_RULE' };
  if (!application.permittedRuleIds.includes(rule.id))
    return { status: 'invalid', code: 'RULE_DISABLED' };
  if (
    application.lines.length !== rule.lineReferences ||
    application.subproofs.length !== rule.subproofReferences
  )
    return { status: 'invalid', code: 'INVALID_REFERENCE' };
  return matchesRule(rule.id, application.conclusion, application.lines, application.subproofs)
    ? { status: 'valid' }
    : { status: 'invalid', code: 'RULE_MISMATCH' };
}
