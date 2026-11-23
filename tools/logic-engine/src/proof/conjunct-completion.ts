import type { FitchProofCheckInput, DependencyProofCheckInput } from '@logiclab/contracts';
import { formulaChainMembers } from '../parser/grouping';
import { readFormula, type ParsedProofFormula } from './proof-formulas';
import type { ProofBudget } from './proof-budget';
import { structureDiagnostics } from './structure-diagnostics';
import { analyzeFitchStructure } from './fitch/structure';
import { evaluateFitchSteps } from './fitch/steps';
import { analyzeDependencyStructure } from './dependency/structure';
import { evaluateDependencySteps } from './dependency/steps';

type Input = FitchProofCheckInput | DependencyProofCheckInput;

/**
 * Completion needs an actual source member, not a correct extracted result. Reuse the checker's
 * bounded source propagation so erased inherited groups cannot create extra selectable positions.
 * Diagnostics stay internal; wrong formulas, support and citations remain reviewable mistakes.
 */
export function filledProofConjunctSelections(
  input: Input,
  premises: Map<string, ParsedProofFormula>,
  budget: ProofBudget,
): boolean {
  const { problem, proof } = input;
  const selections = [];
  for (const step of proof.steps) {
    budget.spend(1);
    if (step.kind !== 'inference') continue;
    if (step.ruleId === 'and_chain_elimination') {
      if (!Number.isInteger(step.conjunctIndex)) return false;
      selections.push(step);
    } else if (step.conjunctIndex !== undefined) return false;
  }
  if (selections.length === 0) return true;

  const diagnostics = structureDiagnostics();
  const formulas = proof.steps.map((step, index) =>
    readFormula(step.formula, budget, diagnostics, index, problem.formulaGroupingVersion),
  );

  // Source provenance uses the same successful local patterns as checking, without requiring
  // a valid proof. Invalid reference/support reports do not by themselves prevent completion.
  if (proof.format === 'fitch') {
    const structure = analyzeFitchStructure(proof);
    if (structure.status !== 'resolved') return false;
    evaluateFitchSteps({ problem, proof }, structure, formulas, premises, budget, diagnostics);
  } else {
    const structure = analyzeDependencyStructure(proof);
    if (structure.status !== 'resolved') return false;
    evaluateDependencySteps({ problem, proof }, structure, formulas, premises, budget, diagnostics);
  }
  if (diagnostics.limited) return false;

  const indices = new Map(proof.steps.map((step, index) => [step.id, index]));
  for (const step of selections) {
    budget.spend(1);
    const sourceIndex = indices.get(step.lineReferences[0]!);
    const source = sourceIndex === undefined ? undefined : formulas[sourceIndex];
    if (
      source?.status !== 'valid' ||
      !source.syntax ||
      source.formula.type !== 'binary' ||
      source.formula.operator !== 'and'
    )
      return false;

    budget.spend(source.size);
    const members = formulaChainMembers(source.syntax);
    if (step.conjunctIndex! < 0 || step.conjunctIndex! >= members.length) return false;
  }
  return true;
}
