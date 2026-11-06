import type { DependencyProofCheckInput, ProofCheckReport } from '@logiclab/contracts';
import type { DependencyStructureResult } from './structure';
import { inferenceDependencyIds, dependencySetsMatch } from './sets';
import { sameFormula } from '../formula-equality';
import { checkParsedRule } from '../parsed-rule';
import type { ParsedProofFormula } from '../proof-formulas';
import type { ProofBudget } from '../proof-budget';
import type { StructureDiagnostics } from '../structure-diagnostics';

type StepReport = ProofCheckReport['steps'][number];
type Structure = Extract<DependencyStructureResult, { status: 'resolved' }>;

function sourceStatus(
  input: DependencyProofCheckInput,
  index: number,
  formulas: ParsedProofFormula[],
  premises: Map<string, ParsedProofFormula>,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
): StepReport['localStatus'] {
  const step = input.proof.steps[index]!;
  const current = formulas[index]!;
  if (!current.formula) return current.status;
  if (step.kind !== 'premise') return 'valid';
  if (step.premiseId === null) {
    diagnostics.add({
      code: 'INCOMPLETE_PROOF',
      message: 'Premise declaration has no selected problem premise.',
      stepIndex: index,
    });
    return 'unassessable';
  }
  const premise = premises.get(step.premiseId);
  if (!premise?.formula) {
    diagnostics.add({
      code: 'INVALID_REFERENCE',
      message: 'Premise declaration must identify a supplied problem premise.',
      stepIndex: index,
    });
    return 'invalid';
  }
  budget.spend(2 * (current.size + premise.size));
  if (sameFormula(current.formula, premise.formula)) return 'valid';
  diagnostics.add({
    code: 'RULE_MISMATCH',
    message: 'Premise formula does not match its supplied problem premise.',
    stepIndex: index,
  });
  return 'invalid';
}

/** Compute support from resolved citations, never from student-written dependency annotations. */
export function evaluateDependencySteps(
  input: DependencyProofCheckInput,
  structure: Structure,
  formulas: ParsedProofFormula[],
  premises: Map<string, ParsedProofFormula>,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
) {
  const reports: StepReport[] = [];
  const dependencies: (string[] | null)[] = [];
  for (const [stepIndex, step] of input.proof.steps.entries()) {
    const reference = structure.references[stepIndex]!;
    let localStatus: StepReport['localStatus'];
    let dependencyStatus: StepReport['dependencyStatus'] =
      reference.status === 'invalid'
        ? 'invalid'
        : reference.status === 'unassessable'
          ? 'unknown'
          : 'valid';
    // Null means unknown support. It must not become an empty set that falsely proves independence.
    let computed: string[] | null = null;
    const cited = new Set<number>();
    if (step.kind !== 'inference') {
      // Each premise/assumption is its own source; premise formula validity is checked separately.
      computed = [step.id];
      localStatus = sourceStatus(input, stepIndex, formulas, premises, budget, diagnostics);
    } else if (reference.status !== 'resolved') {
      localStatus = reference.status === 'invalid' ? 'invalid' : 'unassessable';
    } else {
      const lines = reference.lineIndices.map((index) => dependencies[index] ?? null);
      const branches = reference.discharges.map((pair) => ({
        assumptionId: input.proof.steps[pair.assumptionIndex]!.id,
        conclusionDependencies: dependencies[pair.conclusionIndex] ?? null,
      }));
      reference.lineIndices.forEach((index) => cited.add(index));
      reference.discharges.forEach((pair) => {
        cited.add(pair.assumptionIndex);
        cited.add(pair.conclusionIndex);
      });
      // Compute the union only when every operand's support is known. Discharge is branch-local.
      if (
        lines.every((line) => line !== null) &&
        branches.every((branch) => branch.conclusionDependencies !== null)
      ) {
        const entries =
          lines.reduce((sum, line) => sum + line!.length, 0) +
          branches.reduce((sum, branch) => sum + branch.conclusionDependencies!.length, 0);
        // Bound set construction plus canonical sorting; each result has at most maxSteps sources.
        const width = Math.min(input.proof.steps.length, entries);
        budget.spend(entries + width * Math.ceil(Math.log2(width + 1)));
        computed = inferenceDependencyIds(
          lines.map((line) => line!),
          branches.map((branch) => ({
            ...branch,
            conclusionDependencies: branch.conclusionDependencies!,
          })),
        );
      }
      localStatus = checkParsedRule(
        input.problem,
        step.ruleId,
        formulas[stepIndex]!,
        reference.lineIndices.map((index) => formulas[index]!),
        reference.discharges.map((pair) => ({
          assumption: formulas[pair.assumptionIndex]!,
          conclusion: formulas[pair.conclusionIndex]!,
        })),
        stepIndex,
        budget,
        diagnostics,
      );
    }
    // A locally valid pattern still inherits invalid/unknown support from the work it cites.
    for (const index of cited) {
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
    // Compare the student's written set against independently computed support, not vice versa.
    budget.spend(step.dependencies.length + (computed?.length ?? 0) + 1);
    if (
      !structure.annotationsValid[stepIndex] ||
      (computed !== null && !dependencySetsMatch(step.dependencies, computed))
    ) {
      dependencyStatus = 'invalid';
      if (structure.annotationsValid[stepIndex])
        diagnostics.add({
          code: 'INVALID_DEPENDENCY',
          message: 'Declared dependencies do not match the computed premise/assumption support.',
          stepIndex,
        });
    }
    // Avoid repeating an annotation/reference error when the remaining problem is inherited support.
    if (
      dependencyStatus !== 'valid' &&
      reference.status === 'resolved' &&
      structure.annotationsValid[stepIndex] &&
      (computed === null || dependencySetsMatch(step.dependencies, computed))
    ) {
      diagnostics.add({
        code: dependencyStatus === 'invalid' ? 'INVALID_DEPENDENCY' : 'INCOMPLETE_PROOF',
        message:
          dependencyStatus === 'invalid'
            ? 'Step depends on invalid earlier work.'
            : 'Step depends on work that could not be fully checked.',
        stepIndex,
      });
    }
    dependencies.push(computed);
    reports.push({ stepId: step.id, stepIndex, localStatus, dependencyStatus });
  }
  return { reports, dependencies };
}
