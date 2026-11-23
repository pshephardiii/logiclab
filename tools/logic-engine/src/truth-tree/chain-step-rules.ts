import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import type { TruthTreeStepReport } from '@logiclab/contracts/truth-tree';
import { FormulaParseError } from '../parser/errors';
import { requireExplicitGrouping } from '../parser/grouping';
import { parseTruthTreeFormulaWithSyntax } from './parse-formula';
import { chainContinuationSource } from './chain-continuation';
import { matchTruthTreeChainExpansion } from './chain-expansion';
import { truthTreeSourceDecomposition } from './source-decomposition';
import { truthTreeRuleCatalog } from './rule-catalog';
import { sameStepFormula, type StepContext } from './step-formulas';
import { TruthTreeResourceLimit } from './structure-context';

function syntax(source: string, context: StepContext) {
  context.budget.spend(source.length + 1);
  const result = requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(source));
  context.budget.spend(result.nodes.size);
  return result;
}

/** The initial source comes from the problem, even when a student's spelling removes groups. */
function initialSources(context: StepContext) {
  const premises = new Map(
    context.problem.premises.map((premise) => [premise.id, premise.formula]),
  );
  for (const item of context.structure.tree.occurrences) {
    if (item.origin.kind === 'expansion') continue;
    const text =
      item.origin.kind === 'premise'
        ? premises.get(item.origin.premiseId!)
        : `¬(${context.problem.conclusion})`;
    if (text === undefined) continue;
    const expected = syntax(text, context);
    const actual = context.formulas.get(item.id);
    const continuation =
      actual && sameStepFormula(expected.formula, actual, context.budget)
        ? chainContinuationSource(expected, syntax(item.formula, context), context.budget)
        : text;
    context.authoritativeSources.set(item.id, continuation);
  }
}

/** Match in source-dependency order; array reordering cannot erase or replace trusted boundaries. */
export function checkChainStepExpansions(context: StepContext): TruthTreeStepReport['expansions'] {
  initialSources(context);
  const rank = new Map(context.structure.branchOrder.map((id, index) => [id, index]));
  const position = (id: string, groups: { branchId: string; occurrenceIds: string[] }[]) => {
    const local = groups.find((group) => group.branchId === id);
    return local
      ? context.structure.locations.get(local.occurrenceIds[0]!)!.index
      : context.structure.branches.get(id)!.occurrenceIds.length;
  };
  const ordered = [...context.structure.expansions.values()].sort((left, right) => {
    context.budget.spend();
    return (
      rank.get(left.branchId)! - rank.get(right.branchId)! ||
      position(left.branchId, left.resultGroups) - position(right.branchId, right.resultGroups)
    );
  });
  const reports = new Map<string, TruthTreeStepReport['expansions'][number]>();

  for (const expansion of ordered) {
    context.budget.spend();
    const record = (status: 'valid' | 'invalid' | 'unknown') =>
      reports.set(expansion.id, { expansionId: expansion.id, status });
    const fail = (message: string, incomplete = false) => {
      context.diagnostics.add({
        code: incomplete
          ? CheckerDiagnosticCode.IncompleteTree
          : CheckerDiagnosticCode.RuleMismatch,
        message,
        expansionId: expansion.id,
      });
      record(incomplete ? 'unknown' : 'invalid');
    };
    if (!truthTreeRuleCatalog(2).some((rule) => rule.id === expansion.ruleId)) {
      context.diagnostics.add({
        code: CheckerDiagnosticCode.UnknownRule,
        message: 'Choose a rule from the pinned truth-tree catalog.',
        expansionId: expansion.id,
      });
      record('invalid');
      continue;
    }
    const source = context.authoritativeSources.get(expansion.sourceId!);
    const branch = context.structure.branches.get(expansion.branchId)!;
    // A positive cut follows the graph's left/right children, not transport group-array order.
    const resultGroups =
      expansion.ruleId === 'disjunction' && branch.ending.kind === 'split'
        ? branch.ending.childBranchIds.map((id) =>
            expansion.resultGroups.find((group) => group.branchId === id)!,
          )
        : expansion.resultGroups;
    const groups = resultGroups.map((group) =>
      group.occurrenceIds.map((id) => context.structure.occurrences.get(id)!),
    );
    if (
      !source ||
      !context.formulas.has(expansion.sourceId!) ||
      groups.some((group) => group.some((item) => !context.formulas.has(item.id)))
    ) {
      record('unknown');
      continue;
    }

    try {
      if (expansion.ruleId === 'conjunct_extraction' || expansion.ruleId === 'disjunction') {
        if (!expansion.chainChoice) {
          fail('Select the conjunct or disjunction split.', true);
          continue;
        }
        if (
          expansion.chainChoice.ruleId !== expansion.ruleId ||
          groups.some((group) => group.length !== 1)
        ) {
          fail('The selected chain operation and result groups must match.');
          continue;
        }
        const match = matchTruthTreeChainExpansion(
          {
            ruleCatalogVersion: 2,
            source,
            choice: expansion.chainChoice,
            results: groups.map((group) => group[0]!.formula),
          },
          context.budget,
        );
        if (match.status !== 'matched') {
          if (match.status === 'unassessable')
            throw new TruthTreeResourceLimit(
              'Chain expansion could not be assessed within its source/resource limits.',
            );
          fail('The selected result must respect every source member and explicit group.');
          continue;
        }
        match.derivedSources.forEach((text, index) =>
          context.authoritativeSources.set(groups[index]![0]!.id, text),
        );
        context.chainMatches.set(expansion.id, {
          memberCount: match.memberCount,
          coveredMemberIndices: match.coveredMemberIndices,
        });
        record('valid');
        continue;
      }
      if (expansion.chainChoice) {
        fail('This rule does not use a chain choice.');
        continue;
      }
      const expected = truthTreeSourceDecomposition(source, context.budget);
      if (
        !expected ||
        expected.ruleId !== expansion.ruleId ||
        groups.length !== expected.branches.length
      ) {
        fail('The selected rule does not decompose this source.');
        continue;
      }

      // Normal binary alternatives/components may be reordered, as in catalog 1. Pair each
      // entered occurrence with its matching authoritative formula before continuing from it.
      const remaining = expected.branches.map((branch) =>
        branch.map((text) => syntax(text, context)),
      );
      const continuations: [string, string][] = [];
      let valid = true;
      for (const group of groups) {
        const branchIndex = remaining.findIndex((branch) => {
          if (branch.length !== group.length) return false;
          const unused = [...branch];
          for (const item of group) {
            const index = unused.findIndex((value) =>
              sameStepFormula(value.formula, context.formulas.get(item.id)!, context.budget),
            );
            if (index < 0) return false;
            unused.splice(index, 1);
          }
          return true;
        });
        if (branchIndex < 0) {
          valid = false;
          break;
        }
        const branch = remaining.splice(branchIndex, 1)[0]!;
        for (const item of group) {
          const index = branch.findIndex((value) =>
            sameStepFormula(value.formula, context.formulas.get(item.id)!, context.budget),
          );
          const expectedFormula = branch.splice(index, 1)[0]!;
          continuations.push([
            item.id,
            chainContinuationSource(expectedFormula, syntax(item.formula, context), context.budget),
          ]);
        }
      }
      if (!valid) {
        fail('Generated formulas must match the full binary decomposition.');
        continue;
      }
      continuations.forEach(([id, text]) => context.authoritativeSources.set(id, text));
      record('valid');
    } catch (error) {
      if (!(error instanceof FormulaParseError)) throw error;
      fail('A generated formula or inherited grouping is invalid.');
    }
  }
  return context.structure.tree.expansions.map((expansion) => reports.get(expansion.id)!);
}
