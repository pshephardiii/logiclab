import { FormulaParseError } from '../parser/errors';
import { readTruthTreeInput } from './step-input';
import { truthTreeBudget, TruthTreeResourceLimit } from './structure-context';
import { truthTreeCoverage } from './branch-coverage';
import { truthTreeRuleCatalog } from './rule-catalog';
import { analyzeTruthTreeSteps } from './check-steps';
import { filledChainChoices } from './chain-completeness';
import { truthTreeComponentCoverage } from './component-coverage';
import { parseTruthTreeFormulaWithPolicy } from './parse-formula';
import { decomposeTruthTreeFormula } from './decompose-formula';

/** Filled attempt only. Incorrect formulas/rules/closures remain post-submission review evidence. */
export function isFinishedTruthTreeAttempt(input: unknown): boolean {
  const budget = truthTreeBudget();
  try {
    const read = readTruthTreeInput(input, budget);
    if (read.status !== 'ready') return false;
    const { structure, argument } = read;
    const seen = new Set<string>();
    let conclusions = 0;

    // Given-source identities must all be represented, even though their written text may be wrong.
    for (const occurrence of structure.occurrences.values()) {
      budget.spend();
      if (!occurrence.formula.trim()) return false;
      if (occurrence.origin.kind === 'negated_conclusion') conclusions++;
      if (occurrence.origin.kind === 'premise') {
        const premiseId = occurrence.origin.premiseId!;
        if (!argument.premises.has(premiseId) || seen.has(premiseId)) return false;
        seen.add(premiseId);
      }
    }
    if (conclusions !== 1 || seen.size !== argument.premises.size) return false;

    // Require every field of the selected rule, not a logically correct choice of that rule.
    for (const expansion of structure.expansions.values()) {
      budget.spend();
      const rule = truthTreeRuleCatalog(read.problem.ruleCatalogVersion).find(
        (rule) => rule.id === expansion.ruleId,
      );
      if (
        !rule ||
        expansion.resultGroups.length !== rule.resultFormulaCounts.length ||
        expansion.resultGroups.some(
          (group, index) => group.occurrenceIds.length !== rule.resultFormulaCounts[index],
        )
      )
        return false;
    }

    let coverage: Map<string, Set<string>>;
    if (read.problem.ruleCatalogVersion === 2) {
      // Diagnostics remain private. This context supplies inherited boundaries; filled-choice
      // coverage intentionally does not require logically correct result formulas or closures.
      const context = analyzeTruthTreeSteps(input, budget).context;
      if (!context) return false;
      const choices = filledChainChoices(context);
      if (!choices) return false;
      coverage = truthTreeComponentCoverage(structure, choices, budget);
    } else coverage = truthTreeCoverage(structure, budget);
    const compounds = new Map<string, boolean>();
    for (const branch of structure.branches.values()) {
      if (branch.ending.kind !== 'open') continue;
      const expanded = coverage.get(branch.id)!;
      for (const occurrenceId of structure.paths.get(branch.id)!) {
        budget.spend();
        if (expanded.has(occurrenceId)) continue;
        let compound = compounds.get(occurrenceId);
        if (compound === undefined) {
          const text = structure.occurrences.get(occurrenceId)!.formula;
          budget.spend(text.length);
          try {
            compound =
              decomposeTruthTreeFormula(
                parseTruthTreeFormulaWithPolicy(text, read.formulaGroupingVersion),
              ).kind === 'expansion';
          } catch (error) {
            if (!(error instanceof FormulaParseError)) throw error;
            // An unparseable, unprocessed open formula cannot establish a finished path.
            return false;
          }
          compounds.set(occurrenceId, compound);
        }
        if (compound) return false;
      }
    }
    return true;
  } catch (error) {
    if (!(error instanceof TruthTreeResourceLimit)) throw error;
    return false;
  }
}
