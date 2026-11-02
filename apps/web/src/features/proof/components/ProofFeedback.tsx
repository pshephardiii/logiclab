import type { ProofCheckReport } from '@logiclab/contracts';

/** Render only an authorized, snapshot-bound report; no local checking or grade inference. */
export function ProofFeedback({ report }: { report: ProofCheckReport }) {
  return (
    <section className="proof-feedback" aria-label="Proof feedback">
      <p role="status">
        {report.status === 'accepted'
          ? 'Proof verified.'
          : report.status === 'needs_review'
            ? 'Proof needs attention.'
            : 'Proof could not be fully checked.'}
      </p>
      <p>
        {report.target === 'established'
          ? 'The conclusion is established.'
          : report.target === 'not_established'
            ? 'The conclusion is not established.'
            : 'Whether the conclusion is established could not be determined.'}
      </p>
      <ul>
        {report.diagnostics.map((diagnostic, index) => {
          const position = diagnostic.stepIndex ?? -1;
          return (
            <li key={index}>
              {position >= 0 && `Line ${position + 1}: `}
              {diagnostic.message}
            </li>
          );
        })}
      </ul>
      {report.steps.length > 0 && (
        <details>
          <summary>Line-by-line checks</summary>
          <ul>
            {report.steps.map((step) => (
              <li key={step.stepId}>
                Line {step.stepIndex + 1}: local step {step.localStatus}; supporting dependencies{' '}
                {step.dependencyStatus}.
              </li>
            ))}
          </ul>
          <p className="help">
            A step can match its rule while depending on an earlier mistake. Verification requires
            both valid steps and valid support.
          </p>
        </details>
      )}
    </section>
  );
}
