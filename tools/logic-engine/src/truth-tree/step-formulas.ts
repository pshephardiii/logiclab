import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import type { TruthTreeProblem, TruthTreeStepReport } from '@logiclab/contracts/truth-tree';
import { FormulaParseError } from '../parser/errors';
import { sameFormula } from '../proof/formula-equality';
import { parseTruthTreeFormulaWithPolicy } from './parse-formula';
import type { TruthTreeFormula } from './types';
import type {
  TruthTreeBudget,
  TruthTreeStructure,
  structureDiagnostics,
} from './structure-context';

export type StepContext = {
  structure: TruthTreeStructure;
  problem: TruthTreeProblem;
  authoritativeSources: Map<string, string>;
  chainMatches: Map<string, { memberCount: number; coveredMemberIndices: readonly number[] }>;

  formulas: Map<string, TruthTreeFormula>;
  budget: TruthTreeBudget;
  formulaGroupingVersion?: TruthTreeProblem['formulaGroupingVersion'];
  diagnostics: ReturnType<typeof structureDiagnostics>;
};

/** Charge traversals as well as parsing, including nested compound substitutions. */
export function sameStepFormula(
  left: TruthTreeFormula,
  right: TruthTreeFormula,
  budget: TruthTreeBudget,
) {
  const pending = [left, right];
  while (pending.length) {
    budget.spend();
    const node = pending.pop()!;
    if (node.type === 'not') pending.push(node.operand);
    if (node.type === 'binary') pending.push(node.left, node.right);
  }
  return sameFormula(left, right);
}

export function parseArgument(problem: TruthTreeProblem, budget: TruthTreeBudget) {
  const premises = new Map<string, TruthTreeFormula>();
  for (const premise of problem.premises) {
    budget.spend(
      (premise.formula.length + 1) * (problem.formulaGroupingVersion === undefined ? 1 : 2),
    );
    if (premises.has(premise.id)) return null;
    premises.set(
      premise.id,
      parseTruthTreeFormulaWithPolicy(premise.formula, problem.formulaGroupingVersion),
    );
  }
  budget.spend(
    (problem.conclusion.length + 1) * (problem.formulaGroupingVersion === undefined ? 1 : 2),
  );
  const conclusion = parseTruthTreeFormulaWithPolicy(
    problem.conclusion,
    problem.formulaGroupingVersion,
  );
  const negatedConclusion: TruthTreeFormula = {
    type: 'not',
    operand: conclusion,
  };
  return { premises, conclusion, negatedConclusion };
}

export function parseStepFormulas(context: StepContext): TruthTreeStepReport['occurrences'] {
  return context.structure.tree.occurrences.map((occurrence) => {
    context.budget.spend(
      (occurrence.formula.length + 1) * (context.formulaGroupingVersion === undefined ? 1 : 2),
    );
    if (!occurrence.formula.trim()) {
      context.diagnostics.add({
        code: CheckerDiagnosticCode.IncompleteTree,
        message: 'Enter a formula for this occurrence.',
        occurrenceId: occurrence.id,
      });
      return { occurrenceId: occurrence.id, status: 'incomplete' };
    }
    try {
      context.formulas.set(
        occurrence.id,
        parseTruthTreeFormulaWithPolicy(occurrence.formula, context.formulaGroupingVersion),
      );
      return { occurrenceId: occurrence.id, status: 'valid' };
    } catch (error) {
      if (!(error instanceof FormulaParseError)) throw error;
      context.diagnostics.add({
        code: CheckerDiagnosticCode.InvalidFormula,
        message: error.message,
        occurrenceId: occurrence.id,
      });
      return { occurrenceId: occurrence.id, status: 'invalid' };
    }
  });
}

export function checkInitialFormulas(
  context: StepContext,
  argument: NonNullable<ReturnType<typeof parseArgument>>,
): TruthTreeStepReport['initial'] {
  const seen = new Set<string>();
  let conclusions = 0;
  let invalid = false;
  let incomplete = false;

  for (const occurrence of context.structure.tree.occurrences) {
    const origin = occurrence.origin;
    if (origin.kind === 'expansion') continue;
    const actual = context.formulas.get(occurrence.id);
    const expected =
      origin.kind === 'premise'
        ? argument.premises.get(origin.premiseId!)
        : argument.negatedConclusion;

    // Check identities as well as formulas, so equal-text premises cannot hide a missing source.
    const repeated = origin.kind === 'premise' && seen.has(origin.premiseId!);
    if (origin.kind === 'premise') seen.add(origin.premiseId!);
    else conclusions++;

    if (!expected || repeated || (actual && !sameStepFormula(actual, expected, context.budget))) {
      invalid = true;
      context.diagnostics.add({
        code: CheckerDiagnosticCode.InitialMismatch,
        message:
          'Initial occurrences must match the supplied premises once each and the explicit negation of the supplied conclusion.',
        occurrenceId: occurrence.id,
      });
    }
    if (!actual) incomplete = true;
  }

  if (conclusions > 1) {
    invalid = true;
    context.diagnostics.add({
      code: CheckerDiagnosticCode.InitialMismatch,
      message: 'Include the negated conclusion exactly once.',
    });
  }

  if (conclusions === 0 || [...argument.premises.keys()].some((id) => !seen.has(id))) {
    incomplete = true;
    context.diagnostics.add({
      code: CheckerDiagnosticCode.IncompleteTree,
      message: 'Include every supplied premise and the negated conclusion in the initial segment.',
    });
  }

  return invalid ? 'invalid' : incomplete ? 'unknown' : 'valid';
}
