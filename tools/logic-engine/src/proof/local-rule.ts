import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
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
      code:
        | typeof CheckerDiagnosticCode.UnknownRule
        | typeof CheckerDiagnosticCode.RuleDisabled
        | typeof CheckerDiagnosticCode.InvalidReference
        | typeof CheckerDiagnosticCode.RuleMismatch;
    }
  | {
      status: 'unassessable';
      code:
        | typeof CheckerDiagnosticCode.UnsupportedVersion
        | typeof CheckerDiagnosticCode.IncompleteProof;
    };

/** Check a local inference over trusted parsed formulas and already resolved citations. */
export function checkLocalRule(application: LocalRuleApplication): LocalRuleResult {
  if (application.ruleCatalogVersion !== PROPOSITIONAL_RULE_CATALOG_VERSION)
    return { status: 'unassessable', code: CheckerDiagnosticCode.UnsupportedVersion };

  if (application.ruleId === null)
    return { status: 'unassessable', code: CheckerDiagnosticCode.IncompleteProof };

  const rule = getPropositionalRule(application.ruleId);

  if (!rule) return { status: 'invalid', code: CheckerDiagnosticCode.UnknownRule };

  if (!application.permittedRuleIds.includes(rule.id))
    return { status: 'invalid', code: CheckerDiagnosticCode.RuleDisabled };

  if (
    application.lines.length !== rule.lineReferences ||
    application.subproofs.length !== rule.subproofReferences
  )
    return { status: 'invalid', code: CheckerDiagnosticCode.InvalidReference };

  return matchesRule(rule.id, application.conclusion, application.lines, application.subproofs)
    ? { status: 'valid' }
    : { status: 'invalid', code: CheckerDiagnosticCode.RuleMismatch };
}
