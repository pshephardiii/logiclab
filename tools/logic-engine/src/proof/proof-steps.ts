import type { ProofCheckInput, ProofCheckReport, ProofStep } from '@logiclab/contracts';
import { sameFormula } from './formula-equality';
import { checkLocalRule } from './local-rule';
import { PROPOSITIONAL_RULE_CATALOG } from './rule-catalog';
import type { FitchReferenceCheck, FitchStructureResult } from './fitch-types';
import type { ParsedProofFormula } from './proof-formulas';
import type { ProofBudget } from './proof-budget';
import type { StructureDiagnostics } from './structure-diagnostics';

type StepReport = ProofCheckReport['steps'][number];
type ResolvedStructure = Extract<FitchStructureResult, { status: 'resolved' }>;
const messages = {
  UNKNOWN_RULE: 'Step cites an unsupported rule identity.',
  RULE_DISABLED: 'Step cites a rule that is not permitted for this problem.',
  INVALID_REFERENCE: 'Step does not supply exactly the citations required by its rule.',
  RULE_MISMATCH: 'Formula does not match the cited rule pattern.',
  UNSUPPORTED_VERSION: 'Unsupported rule catalog version.',
  INCOMPLETE_PROOF: 'Step has no selected rule.',
} as const;

function localStatus(
  step: ProofStep,
  stepIndex: number,
  input: ProofCheckInput,
  formulas: ParsedProofFormula[],
  premises: Map<string, ParsedProofFormula>,
  reference: FitchReferenceCheck | undefined,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
): StepReport['localStatus'] {
  const current = formulas[stepIndex]!;
  if (!current.formula) return current.status;
  if (step.kind === 'assumption') return 'valid';
  if (step.kind === 'premise') {
    if (step.premiseId === null) {
      diagnostics.add({
        code: 'INCOMPLETE_PROOF',
        message: 'Premise declaration has no selected problem premise.',
        stepIndex,
      });
      return 'unassessable';
    }
    const premise = premises.get(step.premiseId);
    if (!premise?.formula) {
      diagnostics.add({
        code: 'INVALID_REFERENCE',
        message: 'Premise declaration must identify a supplied problem premise.',
        stepIndex,
      });
      return 'invalid';
    }
    budget.spend(2 * (premise.size + current.size));
    if (sameFormula(current.formula, premise.formula)) return 'valid';
    diagnostics.add({
      code: 'RULE_MISMATCH',
      message: 'Premise formula does not match its supplied problem premise.',
      stepIndex,
    });
    return 'invalid';
  }
  if (!reference || reference.status !== 'resolved')
    return reference?.status === 'invalid' ? 'invalid' : 'unassessable';
  const lines = reference.lineIndices.map((index) => formulas[index]!);
  const subproofs = reference.subproofs.map((span) => ({
    assumption: formulas[span.assumptionIndex]!,
    conclusion: formulas[span.endIndex]!,
  }));
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
      input.problem.permittedRuleIds.length +
      PROPOSITIONAL_RULE_CATALOG.length,
  );
  const result = checkLocalRule({
    ruleCatalogVersion: input.problem.ruleCatalogVersion,
    ruleId: step.ruleId,
    permittedRuleIds: input.problem.permittedRuleIds,
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

/** Propagate support validity separately from whether this step's own pattern is correct. */
export function evaluateProofSteps(
  input: ProofCheckInput,
  structure: ResolvedStructure,
  formulas: ParsedProofFormula[],
  premises: Map<string, ParsedProofFormula>,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
): StepReport[] {
  const reports: StepReport[] = [];
  const references = new Map(
    structure.references.map((reference) => [reference.stepIndex, reference]),
  );
  const blocks = new Map(structure.blocks.map((block) => [block.id, block]));
  for (const [stepIndex, step] of input.proof.steps.entries()) {
    const reference = references.get(stepIndex);
    const dependencies = new Set<number>();
    let scope = step.blockId;
    while (scope !== null) {
      budget.spend(1);
      const block = blocks.get(scope)!;
      if (block.assumptionIndex < stepIndex) dependencies.add(block.assumptionIndex);
      scope = block.parentId;
    }
    if (reference?.status === 'resolved') {
      reference.lineIndices.forEach((index) => dependencies.add(index));
      reference.subproofs.forEach((block) => {
        dependencies.add(block.assumptionIndex);
        dependencies.add(block.endIndex);
      });
    }
    let dependencyStatus: StepReport['dependencyStatus'] =
      reference?.status === 'invalid'
        ? 'invalid'
        : reference?.status === 'unassessable'
          ? 'unknown'
          : 'valid';
    for (const index of dependencies) {
      budget.spend(1);
      const earlier = reports[index]!;
      if (earlier.localStatus === 'invalid' || earlier.dependencyStatus === 'invalid')
        dependencyStatus = 'invalid';
      else if (
        dependencyStatus !== 'invalid' &&
        (earlier.localStatus === 'unassessable' || earlier.dependencyStatus === 'unknown')
      )
        dependencyStatus = 'unknown';
    }
    const status = localStatus(
      step,
      stepIndex,
      input,
      formulas,
      premises,
      reference,
      budget,
      diagnostics,
    );
    if (
      dependencyStatus !== 'valid' &&
      reference?.status !== 'invalid' &&
      reference?.status !== 'unassessable'
    )
      diagnostics.add({
        code: dependencyStatus === 'invalid' ? 'INVALID_DEPENDENCY' : 'INCOMPLETE_PROOF',
        message:
          dependencyStatus === 'invalid'
            ? 'Step depends on invalid earlier work.'
            : 'Step depends on work that could not be fully checked.',
        stepIndex,
      });
    reports.push({ stepId: step.id, stepIndex, localStatus: status, dependencyStatus });
  }
  return reports;
}
