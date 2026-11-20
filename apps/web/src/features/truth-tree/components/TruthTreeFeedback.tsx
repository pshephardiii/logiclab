import type { TruthTreeCheckReport } from '@logiclab/contracts/truth-tree';
import {
  TruthTreeVerdictStatus,
  type TruthTreeVerdictAssessment,
} from '@logiclab/contracts/truth-tree-work';

/** Authoritative or explicitly requested local diagnostics; this component does not run the checker. */
export function TruthTreeFeedback({
  report,
  verdict,
  showArgument = true,
}: {
  report: TruthTreeCheckReport;
  verdict?: TruthTreeVerdictAssessment | null;
  showArgument?: boolean;
}) {
  return (
    <section aria-label="Truth-tree feedback">
      <p role="status">
        Tree check: {report.status}.{showArgument && ` Argument: ${report.argumentStatus}.`}
      </p>
      {verdict && (
        <p role="status">
          Validity verdict:{' '}
          {verdict.status === TruthTreeVerdictStatus.Correct
            ? 'correct.'
            : verdict.status === TruthTreeVerdictStatus.Incorrect
              ? 'incorrect.'
              : verdict.status === TruthTreeVerdictStatus.Unanswered
                ? 'not answered. Choose Valid or Invalid and check again.'
                : 'cannot be assessed until the tree establishes an outcome.'}
        </p>
      )}
      {report.branches.length > 0 && (
        <ul>
          {report.branches.map((branch) => (
            <li key={branch.branchId}>Path: {branch.status.replaceAll('_', ' ')}.</li>
          ))}
        </ul>
      )}
      {showArgument && report.counterexample && (
        <p>
          Counterexample:{' '}
          {Object.entries(report.counterexample.assignment)
            .map(([name, value]) => `${name} = ${value ? 'T' : 'F'}`)
            .join(', ')}
        </p>
      )}
      <ul>
        {[...report.steps.diagnostics, ...report.diagnostics].map((diagnostic, index) => (
          <li key={index}>{diagnostic.message}</li>
        ))}
      </ul>
    </section>
  );
}
