import type { TruthTreeCounterexample } from '@logiclab/contracts/truth-tree';
import { FormulaEvaluationError } from '../evaluator';
import type { TruthTreeStepAnalysis } from './check-steps';
import type { TruthTreeFormula } from './types';
import type { TruthTreeBudget } from './structure-context';

/** Direct classical evaluation, independent of decomposition/coverage and including explicit falsity. */
function evaluate(
  formula: TruthTreeFormula,
  assignment: Record<string, boolean>,
  budget: TruthTreeBudget,
): boolean {
  budget.spend();
  switch (formula.type) {
    case 'bottom':
      return false;
    case 'variable':
      if (!Object.hasOwn(assignment, formula.name))
        throw new FormulaEvaluationError('MISSING_VARIABLE', formula.name);
      return assignment[formula.name]!;
    case 'not':
      return !evaluate(formula.operand, assignment, budget);
    case 'binary': {
      const left = evaluate(formula.left, assignment, budget);
      const right = evaluate(formula.right, assignment, budget);
      switch (formula.operator) {
        case 'and':
          return left && right;
        case 'or':
          return left || right;
        case 'implies':
          return !left || right;
        case 'iff':
          return left === right;
      }
    }
  }
}

/** Derive one total valuation, then independently verify both the path and original argument. */
export function truthTreeCounterexample(
  evidence: NonNullable<TruthTreeStepAnalysis['evidence']>,
  branchId: string,
): TruthTreeCounterexample | null {
  const { context, argument } = evidence;
  const { budget, structure } = context;
  const variables = new Set<string>();
  const pending = [...argument.premises.values(), argument.conclusion];
  while (pending.length) {
    budget.spend();
    const formula = pending.pop()!;
    if (formula.type === 'variable') variables.add(formula.name);
    if (formula.type === 'not') pending.push(formula.operand);
    if (formula.type === 'binary') pending.push(formula.left, formula.right);
  }

  // Variables absent from the chosen branch are unconstrained there; use a stable false default.
  const assignment = Object.fromEntries([...variables].sort().map((name) => [name, false]));
  const literals = new Map<string, boolean>();
  const path = structure.paths.get(branchId)!;
  for (const occurrenceId of path) {
    budget.spend();
    const formula = context.formulas.get(occurrenceId)!;
    const variable =
      formula.type === 'variable'
        ? formula
        : formula.type === 'not' && formula.operand.type === 'variable'
          ? formula.operand
          : null;
    if (!variable) continue;
    const value = formula.type === 'variable';
    if (
      !Object.hasOwn(assignment, variable.name) ||
      (literals.has(variable.name) && literals.get(variable.name) !== value)
    )
      return null;
    literals.set(variable.name, value);
    assignment[variable.name] = value;
  }

  try {
    for (const formula of argument.premises.values()) {
      if (!evaluate(formula, assignment, budget)) return null;
    }
    if (evaluate(argument.conclusion, assignment, budget)) return null;
    for (const occurrenceId of path) {
      if (!evaluate(context.formulas.get(occurrenceId)!, assignment, budget)) return null;
    }
  } catch (error) {
    if (!(error instanceof FormulaEvaluationError)) throw error;
    return null;
  }
  return { branchId, assignment };
}
