import type { ProofCheckReport } from '@logiclab/contracts';
import { readDependencyInput } from './input';
import { analyzeDependencyStructure } from './structure';
import { evaluateDependencySteps } from './steps';
import { readProblem, readFormula } from '../proof-formulas';
import { proofBudget, ProofBudgetExceeded } from '../proof-budget';
import { structureDiagnostics } from '../structure-diagnostics';
import { finishProofReport } from '../report';
import { sameFormula } from '../formula-equality';

/** Standalone staged checker. Callers own authoritative statements, admission and disclosure. */
export function checkDependencyProof(value: unknown): ProofCheckReport {
  const diagnostics = structureDiagnostics();
  function finish(
    status: ProofCheckReport['status'],
    target: ProofCheckReport['target'] = 'unknown',
    steps: ProofCheckReport['steps'] = [],
  ): ProofCheckReport {
    return finishProofReport(diagnostics, status, target, steps);
  }
  const read = readDependencyInput(value);
  if ('diagnostic' in read) {
    diagnostics.add(read.diagnostic);
    return finish('unassessable');
  }
  const { input } = read;
  const budget = proofBudget();
  try {
    const problem = readProblem(input, budget, diagnostics);
    if (diagnostics.items.length) return finish('unassessable');
    budget.spend(
      input.proof.steps.reduce(
        (sum, step) =>
          sum +
          1 +
          step.dependencies.length +
          (step.kind === 'inference' ? step.lineReferences.length + step.discharges.length * 2 : 0),
        0,
      ),
    );
    const structure = analyzeDependencyStructure(input.proof);
    structure.diagnostics.forEach((diagnostic) => diagnostics.add(diagnostic));
    if (structure.status !== 'resolved')
      return finish(
        structure.status === 'unassessable' ? 'unassessable' : 'needs_review',
        'unknown',
        structure.status === 'unassessable'
          ? []
          : input.proof.steps.map((step, stepIndex) => ({
              stepId: step.id,
              stepIndex,
              localStatus: 'unassessable',
              dependencyStatus: 'unknown',
            })),
      );
    const formulas = input.proof.steps.map((step, index) =>
      readFormula(step.formula, budget, diagnostics, index),
    );
    const { reports, dependencies } = evaluateDependencySteps(
      input,
      structure,
      formulas,
      problem.premises,
      budget,
      diagnostics,
    );
    let target: ProofCheckReport['target'] = 'not_established';
    const index = reports.length - 1;
    if (index >= 0) {
      const formula = formulas[index]!,
        final = reports[index]!;
      if (!formula.formula) target = 'unknown';
      else {
        budget.spend(2 * (formula.size + problem.conclusion.size));
        if (sameFormula(formula.formula, problem.conclusion.formula!)) {
          const sources = new Set(
            input.proof.steps.filter((step) => step.kind === 'premise').map((step) => step.id),
          );
          const support = dependencies[index];
          target =
            final.localStatus === 'invalid' ||
            final.dependencyStatus === 'invalid' ||
            (support !== null && support!.some((id) => !sources.has(id)))
              ? 'not_established'
              : final.localStatus === 'unassessable' ||
                  final.dependencyStatus === 'unknown' ||
                  support == null
                ? 'unknown'
                : 'established';
        }
      }
    } else diagnostics.add({ code: 'INCOMPLETE_PROOF', message: 'Proof has no steps.' });
    if (target !== 'established')
      diagnostics.add({
        code: 'TARGET_NOT_ESTABLISHED',
        message:
          'The final line must establish the target without temporary-assumption dependencies.',
      });
    const accepted =
      target === 'established' &&
      diagnostics.items.length === 0 &&
      reports.every((step) => step.localStatus === 'valid' && step.dependencyStatus === 'valid');
    return finish(accepted ? 'accepted' : 'needs_review', target, reports);
  } catch (error) {
    if (!(error instanceof ProofBudgetExceeded)) throw error;
    diagnostics.add({
      code: 'RESOURCE_LIMIT',
      message: error.message,
      ...(error.position === undefined ? {} : { position: error.position }),
      ...(error.stepIndex === undefined ? {} : { stepIndex: error.stepIndex }),
    });
    return finish('unassessable');
  }
}
