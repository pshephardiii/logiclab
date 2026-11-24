import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import { getPropositionalRule, PROPOSITIONAL_RULE_CATALOG_VERSION } from './rule-catalog';
import { matchesRule } from './rule-patterns';
import type { ProofFormula, LocalSubproof } from './types';
import {
  matchProofConjunctExtraction,
  type ProofConjunctExtractionInput,
} from './conjunct-extraction';
import { parseProofFormula } from './parse-formula';
import { sameFormula } from './formula-equality';
import { proofBudget, ProofBudgetExceeded, type ProofBudget } from './proof-budget';

export type LocalRuleApplication = {
  ruleCatalogVersion: number;
  ruleId: string | null;
  permittedRuleIds: readonly string[];
  conclusion: ProofFormula;
  lines: readonly ProofFormula[];
  subproofs: readonly LocalSubproof[];
  formulaGroupingVersion?: 1;
  extraction?: ProofConjunctExtractionInput;
};

export type LocalRuleResult =
  | { status: 'valid'; derivedSource?: string }
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
        | typeof CheckerDiagnosticCode.IncompleteProof
        | typeof CheckerDiagnosticCode.ResourceLimit;
    };

/** Check a local inference over trusted parsed formulas and already resolved citations. */
export function checkLocalRule(
  application: LocalRuleApplication,
  budget: ProofBudget = proofBudget(),
): LocalRuleResult {
  if (
    application.ruleCatalogVersion !== PROPOSITIONAL_RULE_CATALOG_VERSION &&
    (application.ruleCatalogVersion !== 2 || application.formulaGroupingVersion !== 1)
  )
    return { status: 'unassessable', code: CheckerDiagnosticCode.UnsupportedVersion };

  if (application.ruleId === null)
    return { status: 'unassessable', code: CheckerDiagnosticCode.IncompleteProof };

  const rule = getPropositionalRule(application.ruleId, application.ruleCatalogVersion as 1 | 2);

  if (!rule) return { status: 'invalid', code: CheckerDiagnosticCode.UnknownRule };

  if (!application.permittedRuleIds.includes(rule.id))
    return { status: 'invalid', code: CheckerDiagnosticCode.RuleDisabled };

  if (
    application.lines.length !== rule.lineReferences ||
    application.subproofs.length !== rule.subproofReferences
  )
    return { status: 'invalid', code: CheckerDiagnosticCode.InvalidReference };

  if (rule.id === 'and_chain_elimination') {
    if (!application.extraction)
      return { status: 'unassessable', code: CheckerDiagnosticCode.IncompleteProof };
    const match = matchProofConjunctExtraction(application.extraction, budget);
    if (match.status !== 'matched') {
      if (match.status === 'unassessable')
        return {
          status: 'unassessable',
          code:
            match.reason === 'resource_limit'
              ? CheckerDiagnosticCode.ResourceLimit
              : CheckerDiagnosticCode.IncompleteProof,
        };
      return { status: 'invalid', code: CheckerDiagnosticCode.RuleMismatch };
    }

    // Metadata must describe these exact trusted operands, not a replacement local inference.
    try {
      budget.spend(
        8 * (application.extraction.source.length + application.extraction.conclusion.length + 1),
      );
      return sameFormula(parseProofFormula(application.extraction.source), application.lines[0]!) &&
        sameFormula(parseProofFormula(application.extraction.conclusion), application.conclusion)
        ? { status: 'valid', derivedSource: match.derivedSource }
        : { status: 'invalid', code: CheckerDiagnosticCode.RuleMismatch };
    } catch (error) {
      if (!(error instanceof ProofBudgetExceeded)) throw error;
      return { status: 'unassessable', code: CheckerDiagnosticCode.ResourceLimit };
    }
  }
  if (application.extraction)
    return { status: 'invalid', code: CheckerDiagnosticCode.RuleMismatch };

  return matchesRule(rule.id, application.conclusion, application.lines, application.subproofs)
    ? { status: 'valid' }
    : { status: 'invalid', code: CheckerDiagnosticCode.RuleMismatch };
}
