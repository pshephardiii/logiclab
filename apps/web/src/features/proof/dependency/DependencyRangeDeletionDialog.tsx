import type { DependencyProof } from '@logiclab/contracts';
import { ProofDeletionPrompt } from '../components/ProofDeletionPrompt';
import { proofNotation } from '../helpers/proof-notation';

/** Delete only the selected interval; surviving dependency/citation IDs deliberately remain unresolved. */
export function DependencyRangeDeletionDialog({
  proof,
  currentProof,
  from,
  to,
  onConfirm,
  onCancel,
}: {
  proof: DependencyProof;
  currentProof: DependencyProof;
  from: string;
  to: string;
  onConfirm: (next: DependencyProof) => void;
  onCancel: () => void;
}) {
  const first = proof.steps.findIndex((step) => step.id === from);
  const last = proof.steps.findIndex((step) => step.id === to);
  const start = Math.min(first, last),
    end = Math.max(first, last);
  const selected = start < 0 ? [] : proof.steps.slice(start, end + 1);
  const error =
    proof !== currentProof
      ? 'The proof changed while this selection was open. Keep proof work and select the lines again.'
      : !selected.length
        ? 'The selected lines are no longer available.'
        : null;

  return (
    <ProofDeletionPrompt modal label="Delete selected lines?" onCancel={onCancel}>
      {selected.length > 0 && (
        <>
          <p>Delete {start === end ? `line ${start + 1}` : `lines ${start + 1}–${end + 1}`}?</p>
          <ol className="dependency-range-preview" start={start + 1}>
            {selected.map((step) => (
              <li key={step.id}>
                <code>{proofNotation(step.formula) || '(blank)'}</code>
              </li>
            ))}
          </ol>
          <p>
            The other lines stay in place and are renumbered. Citations, dependencies and discharges
            referring to deleted lines remain missing until you repair them.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button
        type="button"
        className="danger"
        disabled={Boolean(error)}
        onClick={() => {
          if (!error)
            onConfirm({
              ...proof,
              steps: proof.steps.filter((_, index) => index < start || index > end),
            });
        }}
      >
        Delete selected lines
      </button>
      <button type="button" className="secondary" onClick={onCancel}>
        Keep proof work
      </button>
    </ProofDeletionPrompt>
  );
}
