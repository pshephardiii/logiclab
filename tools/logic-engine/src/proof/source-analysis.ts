import type { FitchProofCheckInput, DependencyProofCheckInput } from '@logiclab/contracts';
import { readFormula, type ParsedProofFormula } from './proof-formulas';
import type { ProofBudget } from './proof-budget';
import { structureDiagnostics } from './structure-diagnostics';
import { analyzeFitchStructure } from './fitch/structure';
import { evaluateFitchSteps } from './fitch/steps';
import { analyzeDependencyStructure } from './dependency/structure';
import { evaluateDependencySteps } from './dependency/steps';

/** Reuse local-pattern provenance without requiring a correct or complete proof. */
export function readProofSourceFormulas(
  input: FitchProofCheckInput | DependencyProofCheckInput,
  premises: Map<string, ParsedProofFormula>,
  budget: ProofBudget,
): ParsedProofFormula[] | null {
  const { problem, proof } = input;
  const diagnostics = structureDiagnostics();
  const formulas = proof.steps.map((step, index) =>
    readFormula(step.formula, budget, diagnostics, index, problem.formulaGroupingVersion),
  );

  // Source provenance uses the same successful local patterns as checking, without requiring
  // a valid proof. Invalid reference/support reports do not by themselves prevent completion.
  if (proof.format === 'fitch') {
    const structure = analyzeFitchStructure(proof);
    if (structure.status !== 'resolved') return null;
    evaluateFitchSteps({ problem, proof }, structure, formulas, premises, budget, diagnostics);
  } else {
    const structure = analyzeDependencyStructure(proof);
    if (structure.status !== 'resolved') return null;
    evaluateDependencySteps({ problem, proof }, structure, formulas, premises, budget, diagnostics);
  }
  if (diagnostics.limited) return null;

  return formulas;
}
