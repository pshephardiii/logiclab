import type { ProofProblem, ProofCheckReport } from '@logiclab/contracts';
import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import { checkLocalRule } from './local-rule';
import { propositionalRuleCatalog, type PropositionalRuleId } from './rule-catalog';
import { ruleCorrespondences } from './rule-patterns';
import { carryProofGrouping, setProofSource } from './source-grouping';
import { ProofBudgetExceeded } from './proof-budget';
import type { ParsedProofFormula } from './proof-formulas';
import type { ProofBudget } from './proof-budget';
import type { StructureDiagnostics } from './structure-diagnostics';

const messages = {
  [CheckerDiagnosticCode.UnknownRule]: 'Step cites an unsupported rule identity.',
  [CheckerDiagnosticCode.RuleDisabled]: 'Step cites a rule that is not permitted for this problem.',
  [CheckerDiagnosticCode.InvalidReference]:
    'Step does not supply exactly the citations required by its rule.',
  [CheckerDiagnosticCode.RuleMismatch]: 'Formula does not match the cited rule pattern.',
  [CheckerDiagnosticCode.UnsupportedVersion]: 'Unsupported rule catalog version.',
  [CheckerDiagnosticCode.IncompleteProof]: 'Select a rule and any required conjunct.',
  [CheckerDiagnosticCode.ResourceLimit]: 'Proof checking resource limits were reached.',
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
  conjunctIndex?: number | null,
): ProofCheckReport['steps'][number]['localStatus'] {
  if (!current.formula) return current.status;

  if (
    lines.some((line) => !line.formula) ||
    subproofs.some((subproof) => !subproof.assumption.formula || !subproof.conclusion.formula)
  )
    return 'unassessable';

  if (conjunctIndex !== undefined && ruleId !== 'and_chain_elimination') {
    diagnostics.add({
      code: CheckerDiagnosticCode.RuleMismatch,
      message: 'This rule does not use a conjunct selection.',
      stepIndex,
    });
    return 'invalid';
  }

  // Conservative comparison charge: rule patterns use at most six structural comparisons.
  budget.spend(
    8 *
      (current.size +
        lines.reduce((sum, line) => sum + line.size, 0) +
        subproofs.reduce((sum, block) => sum + block.assumption.size + block.conclusion.size, 0)) +
      problem.permittedRuleIds.length +
      propositionalRuleCatalog(problem.ruleCatalogVersion).length,
  );

  const result = checkLocalRule(
    {
      ruleCatalogVersion: problem.ruleCatalogVersion,
      formulaGroupingVersion: problem.formulaGroupingVersion,
      ruleId: ruleId,
      permittedRuleIds: problem.permittedRuleIds,
      conclusion: current.formula,
      lines: lines.map((line) => line.formula!),
      subproofs: subproofs.map((block) => ({
        assumption: block.assumption.formula!,
        conclusion: block.conclusion.formula!,
      })),
      ...(ruleId === 'and_chain_elimination' &&
      problem.ruleCatalogVersion === 2 &&
      Number.isInteger(conjunctIndex) &&
      lines[0]?.status === 'valid' &&
      lines[0].syntax &&
      current.syntax
        ? {
            extraction: {
              ruleCatalogVersion: 2 as const,
              formulaGroupingVersion: 1 as const,
              source: lines[0].syntax.source,
              conclusion: current.syntax.source,
              memberIndex: conjunctIndex!,
            },
          }
        : {}),
    },
    budget,
  );

  if (result.status === 'unassessable' && result.code === CheckerDiagnosticCode.ResourceLimit)
    throw new ProofBudgetExceeded();

  if (result.status === 'valid' && problem.ruleCatalogVersion === 2) {
    if (result.derivedSource !== undefined) setProofSource(current, result.derivedSource, budget);
    else {
      // Permission and arity are already checked. Reuse the successful pattern's exact witnesses.
      budget.spend(
        8 *
          (current.size +
            lines.reduce((sum, line) => sum + line.size, 0) +
            subproofs.reduce(
              (sum, block) => sum + block.assumption.size + block.conclusion.size,
              0,
            )),
      );
      const pairs = ruleCorrespondences(
        ruleId as PropositionalRuleId,
        current.formula,
        lines.map((line) => line.formula!),
        subproofs.map((block) => ({
          assumption: block.assumption.formula!,
          conclusion: block.conclusion.formula!,
        })),
      )!;
      carryProofGrouping(
        current,
        pairs,
        [...lines, ...subproofs.flatMap((block) => [block.assumption, block.conclusion])],
        budget,
      );
    }
  }

  if (result.status !== 'valid')
    diagnostics.add({ code: result.code, message: messages[result.code], stepIndex });

  return result.status;
}
