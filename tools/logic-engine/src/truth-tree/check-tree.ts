import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import type { TruthTreeCheckReport, TruthTreeStepReport } from '@logiclab/contracts/truth-tree';
import { analyzeTruthTreeSteps } from './check-steps';
import { truthTreeBranchOutcomes } from './branch-outcomes';
import { truthTreeCounterexample } from './counterexample';
import { truthTreeBudget, TruthTreeResourceLimit, type TruthTreeBudget } from './structure-context';

function failure(
  code:
    typeof CheckerDiagnosticCode.ResourceLimit | typeof CheckerDiagnosticCode.VerificationFailed,
  message: string,
  version: 1 | 2 = 1,
): TruthTreeCheckReport {
  const steps: TruthTreeStepReport = {
    checkerVersion: 1,
    ruleCatalogVersion: version,
    status: 'unassessable',
    initial: 'unknown',
    occurrences: [],
    expansions: [],
    closures: [],
    diagnostics: [{ code, message }],
  };
  return {
    checkerVersion: 1,
    ruleCatalogVersion: version,
    status: 'unassessable',
    argumentStatus: 'undetermined',
    steps,
    branches: [],
    counterexample: null,
    diagnostics: [],
  };
}

/** Verify the submitted tree, never search for a proof or infer invalidity from unfinished work. */
export function checkTruthTree(
  input: unknown,
  budget: TruthTreeBudget = truthTreeBudget(),
): TruthTreeCheckReport {
  let version: 1 | 2 = 1;
  try {
    const { report: steps, evidence } = analyzeTruthTreeSteps(input, budget);
    version = steps.ruleCatalogVersion;
    const base = {
      checkerVersion: 1 as const,
      ruleCatalogVersion: steps.ruleCatalogVersion,
      steps,
    };
    if (!evidence) {
      if (steps.status === 'checked')
        return failure(
          CheckerDiagnosticCode.VerificationFailed,
          'Checked step evidence was not available for branch verification.',
          version,
        );
      return {
        ...base,
        status: steps.status,
        argumentStatus: 'undetermined',
        branches: [],
        counterexample: null,
        diagnostics: [],
      };
    }

    const branches = truthTreeBranchOutcomes(evidence.context);
    if (branches.length && branches.every((branch) => branch.status === 'closed'))
      return {
        ...base,
        status: 'verified',
        argumentStatus: 'valid',
        branches,
        counterexample: null,
        diagnostics: [],
      };

    const open = branches.find((branch) => branch.status === 'open_complete');
    if (open) {
      const counterexample = truthTreeCounterexample(evidence, open.branchId);
      if (!counterexample)
        return failure(
          CheckerDiagnosticCode.VerificationFailed,
          'The completed branch did not yield an independently verified counterexample.',
          version,
        );
      return {
        ...base,
        status: 'verified',
        argumentStatus: 'invalid',
        branches,
        counterexample,
        diagnostics: [],
      };
    }

    return {
      ...base,
      status: 'incomplete',
      argumentStatus: 'undetermined',
      branches,
      counterexample: null,
      diagnostics: [
        {
          code: CheckerDiagnosticCode.IncompleteTree,
          message: 'Close contradictory branches explicitly or finish decomposing an open branch.',
        },
      ],
    };
  } catch (error) {
    if (!(error instanceof TruthTreeResourceLimit)) throw error;
    return failure(CheckerDiagnosticCode.ResourceLimit, error.message, version);
  }
}
