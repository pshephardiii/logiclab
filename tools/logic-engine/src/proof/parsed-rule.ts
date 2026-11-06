import type { ProofProblem, ProofCheckReport } from '@logiclab/contracts';
import { checkLocalRule } from './local-rule';
import { PROPOSITIONAL_RULE_CATALOG } from './rule-catalog';
import type { ParsedProofFormula } from './proof-formulas';
import type { ProofBudget } from './proof-budget';
import type { StructureDiagnostics } from './structure-diagnostics';

const messages = {
  UNKNOWN_RULE: 'Step cites an unsupported rule identity.',
  RULE_DISABLED: 'Step cites a rule that is not permitted for this problem.',
  INVALID_REFERENCE: 'Step does not supply exactly the citations required by its rule.',
  RULE_MISMATCH: 'Formula does not match the cited rule pattern.',
  UNSUPPORTED_VERSION: 'Unsupported rule catalog version.',
  INCOMPLETE_PROOF: 'Step has no selected rule.',
} as const;

/** Formula matching shared by structural adapters; callers resolve access and support separately. */
export function checkParsedRule(
  problem: ProofProblem,
  ruleId: string | null,
  current: ParsedProofFormula,
  lines: ParsedProofFormula[],
  subproofs: { assumption: ParsedProofFormula; conclusion: ParsedProofFormula }[],
  stepIndex: number,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
): ProofCheckReport['steps'][number]['localStatus'] {
  if (!current.formula) return current.status;

  if (
    lines.some((line) => !line.formula) ||
    subproofs.some((subproof) => !subproof.assumption.formula || !subproof.conclusion.formula)
  )
    return 'unassessable';

  // Conservative comparison charge: rule patterns use at most six structural comparisons.
  budget.spend(
    8 *
      (current.size +
        lines.reduce((sum, line) => sum + line.size, 0) +
        subproofs.reduce((sum, block) => sum + block.assumption.size + block.conclusion.size, 0)) +
      problem.permittedRuleIds.length +
      PROPOSITIONAL_RULE_CATALOG.length,
  );

  const result = checkLocalRule({
    ruleCatalogVersion: problem.ruleCatalogVersion,
    ruleId: ruleId,
    permittedRuleIds: problem.permittedRuleIds,
    conclusion: current.formula,
    lines: lines.map((line) => line.formula!),
    subproofs: subproofs.map((block) => ({
      assumption: block.assumption.formula!,
      conclusion: block.conclusion.formula!,
    })),
  });

  if (result.status !== 'valid')
    diagnostics.add({ code: result.code, message: messages[result.code], stepIndex });

  return result.status;
}
