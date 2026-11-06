import type { FitchProofCheckInput, ProofCheckReport, FitchProofStep } from '@logiclab/contracts';
import { sameFormula } from '../formula-equality';
import { checkParsedRule } from '../parsed-rule';
import type { FitchReferenceCheck, FitchStructureResult } from './types';
import type { ParsedProofFormula } from '../proof-formulas';
import type { ProofBudget } from '../proof-budget';
import type { StructureDiagnostics } from '../structure-diagnostics';

type StepReport = ProofCheckReport['steps'][number];

type ResolvedStructure = Extract<FitchStructureResult, { status: 'resolved' }>;

function localStatus(
  step: FitchProofStep,
  stepIndex: number,
  input: FitchProofCheckInput,
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

  return checkParsedRule(
    input.problem,
    step.ruleId,
    current,
    reference.lineIndices.map((index) => formulas[index]!),
    reference.subproofs.map((span) => ({
      assumption: formulas[span.assumptionIndex]!,
      conclusion: formulas[span.endIndex]!,
    })),
    stepIndex,
    budget,
    diagnostics,
  );
}

/** Propagate support validity separately from whether this step's own pattern is correct. */
export function evaluateFitchSteps(
  input: FitchProofCheckInput,
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

    // Each line inherits its enclosing assumptions, even when it does not explicitly cite them.
    let scope = step.blockId;

    while (scope !== null) {
      budget.spend(1);

      const block = blocks.get(scope)!;

      if (block.assumptionIndex < stepIndex) dependencies.add(block.assumptionIndex);

      scope = block.parentId;
    }

    // Add explicit cited lines and the endpoints of discharged boxes to that support.
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

    // Invalid support takes precedence over unknown support; later correct patterns cannot erase it.
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

    // Check this line's own pattern separately so review can distinguish local from upstream errors.
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
