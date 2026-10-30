import { proofCheckReportSchema, type ProofCheckReport } from '@logiclab/contracts';
import { analyzeFitchStructure } from './fitch-structure';
import { sameFormula } from './formula-equality';
import { readProofInput } from './proof-input';
import { readProblem, readFormula } from './proof-formulas';
import { evaluateProofSteps } from './proof-steps';
import { proofBudget, ProofBudgetExceeded } from './proof-budget';
import { structureDiagnostics } from './structure-diagnostics';

export const PROOF_CHECKER_VERSION = 1;

/** Deterministic Fitch checking of bounded plain data; no proof search, grades or disclosure policy. */
export function checkProof(value: unknown): ProofCheckReport {
  const diagnostics = structureDiagnostics();
  function finish(
    status: ProofCheckReport['status'],
    target: ProofCheckReport['target'] = 'unknown',
    steps: ProofCheckReport['steps'] = [],
  ): ProofCheckReport {
    return proofCheckReportSchema.parse({
      checkerVersion: PROOF_CHECKER_VERSION,
      ruleCatalogVersion: 1,
      status: diagnostics.limited ? 'unassessable' : status,
      target: diagnostics.limited ? 'unknown' : target,
      steps: diagnostics.limited ? [] : steps,
      diagnostics: diagnostics.result(),
    });
  }
  const read = readProofInput(value);
  if ('diagnostic' in read) {
    diagnostics.add(read.diagnostic);
    return finish('unassessable');
  }
  const { input } = read;
  const budget = proofBudget();
  try {
    const problem = readProblem(input, budget, diagnostics);
    if (diagnostics.items.length) return finish('unassessable');
    const structure = analyzeFitchStructure(input.proof);
    structure.diagnostics.forEach((diagnostic) => diagnostics.add(diagnostic));
    if (structure.status !== 'resolved') {
      if (structure.status === 'unassessable') return finish('unassessable');
      return finish(
        'needs_review',
        'unknown',
        input.proof.steps.map((step, stepIndex) => ({
          stepId: step.id,
          stepIndex,
          localStatus: 'unassessable',
          dependencyStatus: 'unknown',
        })),
      );
    }
    const formulas = input.proof.steps.map((step, index) =>
      readFormula(step.formula, budget, diagnostics, index),
    );
    const steps = evaluateProofSteps(
      input,
      structure,
      formulas,
      problem.premises,
      budget,
      diagnostics,
    );
    let target: ProofCheckReport['target'] = 'not_established';
    let finalIndex = input.proof.steps.length - 1;
    while (finalIndex >= 0 && input.proof.steps[finalIndex]!.blockId !== null) finalIndex--;
    if (finalIndex >= 0) {
      const final = steps[finalIndex]!;
      const formula = formulas[finalIndex]!;
      if (!formula.formula) target = 'unknown';
      else {
        budget.spend(2 * (formula.size + problem.conclusion.size));
        if (sameFormula(formula.formula, problem.conclusion.formula!))
          target =
            final.localStatus === 'invalid' || final.dependencyStatus === 'invalid'
              ? 'not_established'
              : final.localStatus === 'unassessable' || final.dependencyStatus === 'unknown'
                ? 'unknown'
                : 'established';
      }
    }
    if (target !== 'established')
      diagnostics.add({
        code: 'TARGET_NOT_ESTABLISHED',
        message:
          target === 'unknown'
            ? 'The final root-level target could not be fully assessed.'
            : 'The final root-level line does not establish the target.',
      });
    const accepted =
      target === 'established' &&
      diagnostics.items.length === 0 &&
      steps.every((step) => step.localStatus === 'valid' && step.dependencyStatus === 'valid');
    return finish(accepted ? 'accepted' : 'needs_review', target, steps);
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
