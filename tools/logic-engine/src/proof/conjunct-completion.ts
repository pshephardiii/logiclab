import type { FitchProofCheckInput, DependencyProofCheckInput } from '@logiclab/contracts';
import { formulaChainMembers } from '../parser/grouping';
import type { ParsedProofFormula } from './proof-formulas';
import type { ProofBudget } from './proof-budget';
import { readProofSourceFormulas } from './source-analysis';

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
  const { proof } = input;
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

  const formulas = readProofSourceFormulas(input, premises, budget);
  if (!formulas) return false;

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
