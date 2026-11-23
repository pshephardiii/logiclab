import { truthTreeComponentCoverage } from './component-coverage';
import type { TruthTreeBranchOutcome } from '@logiclab/contracts/truth-tree';
import { decomposeTruthTreeFormula } from './decompose-formula';
import type { StepContext } from './step-formulas';
import type { TruthTreeFormula } from './types';
import { truthTreeCoverage } from './branch-coverage';

/** Canonical syntax keys support exact complement lookup without quadratic pair comparisons. */
function formulaKeys(context: StepContext) {
  const cache = new WeakMap<TruthTreeFormula, string>();
  function key(formula: TruthTreeFormula): string {
    context.budget.spend();
    const previous = cache.get(formula);
    if (previous !== undefined) return previous;

    let value: string;
    switch (formula.type) {
      case 'variable':
        value = `var(${formula.name})`;
        break;
      case 'bottom':
        value = 'bottom';
        break;
      case 'not':
        value = `not(${key(formula.operand)})`;
        break;
      case 'binary':
        value = `${formula.operator}(${key(formula.left)},${key(formula.right)})`;
        break;
    }
    cache.set(formula, value);
    return value;
  }
  return key;
}

/** Only called after all entered steps pass; coverage is occurrence- and path-specific. */
export function truthTreeBranchOutcomes(context: StepContext): TruthTreeBranchOutcome[] {
  const { structure, budget } = context;
  const key = formulaKeys(context);
  const coverage =
    context.problem.ruleCatalogVersion === 2
      ? truthTreeComponentCoverage(structure, context.chainMatches, budget)
      : truthTreeCoverage(structure, budget);
  const outcomes: TruthTreeBranchOutcome[] = [];

  for (const branchId of structure.branchOrder) {
    const branch = structure.branches.get(branchId)!;
    const expanded = coverage.get(branchId)!;

    if (branch.ending.kind === 'split') continue;
    if (branch.ending.kind === 'closed') {
      // A verified contradiction closes the path without decomposing its remaining compounds.
      outcomes.push({ branchId, status: 'closed', unexpandedOccurrenceIds: [] });
      continue;
    }

    const seen = new Set<string>();
    const unexpandedOccurrenceIds: string[] = [];
    let contradictory = false;

    for (const occurrenceId of structure.paths.get(branchId)!) {
      budget.spend();
      const formula = context.formulas.get(occurrenceId)!;
      const current = key(formula);
      if (
        formula.type === 'bottom' ||
        seen.has(`not(${current})`) ||
        (formula.type === 'not' && seen.has(key(formula.operand)))
      )
        contradictory = true;
      seen.add(current);

      if (decomposeTruthTreeFormula(formula).kind === 'expansion' && !expanded.has(occurrenceId))
        unexpandedOccurrenceIds.push(occurrenceId);
    }

    outcomes.push({
      branchId,
      unexpandedOccurrenceIds,
      status: contradictory
        ? 'needs_closure'
        : unexpandedOccurrenceIds.length
          ? 'incomplete'
          : 'open_complete',
    });
  }
  return outcomes;
}
