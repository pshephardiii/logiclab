import type { TruthTreeCheckReport } from '@logiclab/contracts/truth-tree';

/** Authoritative or explicitly requested local diagnostics; this component does not run the checker. */
export function TruthTreeFeedback({ report }: { report: TruthTreeCheckReport }) {
  return (
    <section aria-label="Truth-tree feedback">
      <p role="status">
        Tree check: {report.status}. Argument: {report.argumentStatus}.
      </p>
      {report.branches.length > 0 && (
        <ul>
          {report.branches.map((branch) => (
            <li key={branch.branchId}>Path: {branch.status.replaceAll('_', ' ')}.</li>
          ))}
        </ul>
      )}
      <ul>
        {[...report.steps.diagnostics, ...report.diagnostics].map((diagnostic, index) => (
          <li key={index}>{diagnostic.message}</li>
        ))}
      </ul>
    </section>
  );
}
