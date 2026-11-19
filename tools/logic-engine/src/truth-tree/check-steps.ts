import {
  TRUTH_TREE_LIMITS,
  truthTreeProblemSchema,
  type TruthTreeDiagnostic,
  type TruthTreeStepReport,
} from '@logiclab/contracts/truth-tree';
import { FormulaParseError } from '../parser/errors';
import { analyzeTruthTreeStructure } from './structure';
import {
  truthTreeBudget,
  TruthTreeResourceLimit,
  structureDiagnostics,
  type TruthTreeBudget,
} from './structure-context';
import {
  parseArgument,
  parseStepFormulas,
  checkInitialFormulas,
  type StepContext,
} from './step-formulas';
import { checkStepExpansions, checkStepClosures } from './step-rules';

export type TruthTreeStepAnalysis = {
  report: TruthTreeStepReport;
  evidence: {
    context: StepContext;
    argument: NonNullable<ReturnType<typeof parseArgument>>;
  } | null;
};

function stopped(
  status: 'unassessable' | 'invalid' | 'incomplete',
  diagnostics: TruthTreeDiagnostic[],
): TruthTreeStepAnalysis {
  return {
    evidence: null,
    report: {
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      status,
      initial: 'unknown',
      occurrences: [],
      expansions: [],
      closures: [],
      diagnostics,
    },
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Check entered steps only: checked is not a validity/invalidity verdict or branch completeness. */
export function checkTruthTreeSteps(
  input: unknown,
  budget: TruthTreeBudget = truthTreeBudget(),
): TruthTreeStepReport {
  return analyzeTruthTreeSteps(input, budget).report;
}

/** Internal evidence allows whole-tree checking to reuse parsing, structure and the same budget. */
export function analyzeTruthTreeSteps(
  input: unknown,
  budget: TruthTreeBudget,
): TruthTreeStepAnalysis {
  try {
    if (
      !record(input) ||
      Object.keys(input).length !== 2 ||
      !Object.hasOwn(input, 'problem') ||
      !Object.hasOwn(input, 'tree')
    )
      return stopped('unassessable', [
        {
          code: 'INVALID_STRUCTURE',
          message: 'Provide exactly an authoritative problem and a submitted tree.',
        },
      ]);

    // Bound argument data before contract parsing; the structural reader bounds the tree itself.
    if (record(input.problem)) {
      const { premises, conclusion, ruleCatalogVersion } = input.problem;
      if (ruleCatalogVersion !== 1)
        return stopped('unassessable', [
          { code: 'UNSUPPORTED_VERSION', message: 'Unsupported truth-tree rule catalog.' },
        ]);
      if (
        (Array.isArray(premises) && premises.length > TRUTH_TREE_LIMITS.maxPremises) ||
        (typeof conclusion === 'string' &&
          conclusion.length > TRUTH_TREE_LIMITS.maxFormulaLength) ||
        (Array.isArray(premises) &&
          premises.some(
            (premise) =>
              record(premise) &&
              typeof premise.formula === 'string' &&
              premise.formula.length > TRUTH_TREE_LIMITS.maxFormulaLength,
          ))
      )
        throw new TruthTreeResourceLimit('Truth-tree argument limit exceeded.');
    }
    const parsed = truthTreeProblemSchema.safeParse(input.problem);
    if (!parsed.success)
      return stopped('unassessable', [
        {
          code: 'INVALID_PROBLEM',
          message: 'The supplied argument does not match the supported contract.',
        },
      ]);

    let argument;
    try {
      argument = parseArgument(parsed.data, budget);
    } catch (error) {
      if (!(error instanceof FormulaParseError)) throw error;
      return stopped('unassessable', [
        { code: 'INVALID_PROBLEM', message: 'The supplied argument contains an invalid formula.' },
      ]);
    }
    if (!argument)
      return stopped('unassessable', [
        { code: 'INVALID_PROBLEM', message: 'Supplied premise identities must be distinct.' },
      ]);

    const resolved = analyzeTruthTreeStructure(input.tree, budget);
    if (resolved.status !== 'resolved') return stopped(resolved.status, resolved.diagnostics);

    const diagnostics = structureDiagnostics();
    const context: StepContext = {
      structure: resolved.structure,
      formulas: new Map(),
      diagnostics,
      budget,
    };
    const occurrences = parseStepFormulas(context);
    const initial = checkInitialFormulas(context, argument);
    const expansions = checkStepExpansions(context);
    const closures = checkStepClosures(context);
    const status = diagnostics.invalid
      ? 'invalid'
      : diagnostics.items.length
        ? 'incomplete'
        : 'checked';
    return {
      evidence: status === 'checked' ? { context, argument } : null,
      report: {
        checkerVersion: 1,
        ruleCatalogVersion: 1,
        status,
        initial,
        occurrences,
        expansions,
        closures,
        diagnostics: diagnostics.items,
      },
    };
  } catch (error) {
    if (!(error instanceof TruthTreeResourceLimit)) throw error;
    return stopped('unassessable', [{ code: 'RESOURCE_LIMIT', message: error.message }]);
  }
}
