import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import type { TruthTreeStepReport } from '@logiclab/contracts/truth-tree';
import { decomposeTruthTreeFormula } from './decompose-formula';
import { TRUTH_TREE_RULE_CATALOG } from './rule-catalog';
import { sameStepFormula, type StepContext } from './step-formulas';
import type { TruthTreeFormula } from './types';

/** Match multisets, preserving repeated components rather than collapsing them into sets. */
function matchesGroup(
  actual: TruthTreeFormula[],
  expected: readonly TruthTreeFormula[],
  context: StepContext,
) {
  if (actual.length !== expected.length) return false;
  const unused = [...actual];
  for (const formula of expected) {
    const index = unused.findIndex((entry) => sameStepFormula(entry, formula, context.budget));
    if (index < 0) return false;
    unused.splice(index, 1);
  }
  return true;
}

export function checkStepExpansions(context: StepContext): TruthTreeStepReport['expansions'] {
  return context.structure.tree.expansions.map((expansion) => {
    const result = (status: 'valid' | 'invalid' | 'unknown') => ({
      expansionId: expansion.id,
      status,
    });
    const fail = (
      code: typeof CheckerDiagnosticCode.UnknownRule | typeof CheckerDiagnosticCode.RuleMismatch,
      message: string,
    ) => {
      context.diagnostics.add({ code, message, expansionId: expansion.id });
      return result('invalid');
    };
    context.budget.spend();
    if (!TRUTH_TREE_RULE_CATALOG.some((rule) => rule.id === expansion.ruleId))
      return fail(
        CheckerDiagnosticCode.UnknownRule,
        'Choose a rule from the supported truth-tree catalog.',
      );

    const source = context.formulas.get(expansion.sourceId!);
    const actual = expansion.resultGroups.map((group) =>
      group.occurrenceIds.map((id) => context.formulas.get(id)),
    );
    if (!source || actual.some((group) => group.some((formula) => !formula)))
      return result('unknown');

    const expected = decomposeTruthTreeFormula(source);
    if (expected.kind !== 'expansion' || expected.ruleId !== expansion.ruleId)
      return fail(
        CheckerDiagnosticCode.RuleMismatch,
        'The selected rule does not decompose this source formula.',
      );

    // Both alternatives must match, but neither left/right order nor component order is fixed.
    const unmatched = [...expected.branches];
    for (const group of actual) {
      const parsed = group as TruthTreeFormula[];
      const index = unmatched.findIndex((branch) => matchesGroup(parsed, branch, context));
      if (index < 0)
        return fail(
          CheckerDiagnosticCode.RuleMismatch,
          'Generated formulas must match the complete decomposition, including every alternative and repeated component.',
        );
      unmatched.splice(index, 1);
    }

    return unmatched.length === 0
      ? result('valid')
      : fail(CheckerDiagnosticCode.RuleMismatch, 'The decomposition is missing an alternative.');
  });
}

export function checkStepClosures(context: StepContext): TruthTreeStepReport['closures'] {
  const results: TruthTreeStepReport['closures'] = [];
  for (const branch of context.structure.branches.values()) {
    if (branch.ending.kind !== 'closed') continue;
    const closure = branch.ending.closure!;
    const ids = closure.kind === 'falsity' ? [closure.occurrenceId] : closure.occurrenceIds;
    const formulas = ids.map((id) => context.formulas.get(id));
    if (formulas.some((formula) => !formula)) {
      results.push({ branchId: branch.id, status: 'unknown' });
      continue;
    }

    // Structural analysis already established distinct witnesses on this exact path.
    const valid =
      closure.kind === 'falsity'
        ? formulas[0]!.type === 'bottom'
        : sameStepFormula({ type: 'not', operand: formulas[0]! }, formulas[1]!, context.budget) ||
          sameStepFormula(formulas[0]!, { type: 'not', operand: formulas[1]! }, context.budget);
    results.push({ branchId: branch.id, status: valid ? 'valid' : 'invalid' });
    if (!valid)
      context.diagnostics.add({
        code: CheckerDiagnosticCode.InvalidClosure,
        message: 'Close a branch using an exact complementary pair or explicit falsity.',
        branchId: branch.id,
      });
  }
  return results;
}
