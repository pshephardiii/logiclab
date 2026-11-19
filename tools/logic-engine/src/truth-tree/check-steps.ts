import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import { type TruthTreeDiagnostic, type TruthTreeStepReport } from '@logiclab/contracts/truth-tree';
import { readTruthTreeInput } from './step-input';
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
    const read = readTruthTreeInput(input, budget);
    if (read.status !== 'ready') return stopped(read.status, read.diagnostics);
    const { argument } = read;

    const diagnostics = structureDiagnostics();
    const context: StepContext = {
      structure: read.structure,
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
    return stopped('unassessable', [
      { code: CheckerDiagnosticCode.ResourceLimit, message: error.message },
    ]);
  }
}
