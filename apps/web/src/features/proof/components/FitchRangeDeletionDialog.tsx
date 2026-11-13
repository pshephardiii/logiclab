import type { FitchProof } from '@logiclab/contracts';
import { fitchLineRange } from '../helpers/fitch-line-range';
import { proofNotation } from '../helpers/proof-notation';
import { ProofDeletionPrompt } from './ProofDeletionPrompt';

export function FitchRangeDeletionDialog({
  proof,
  currentProof,
  from,
  to,
  onConfirm,
  onCancel,
}: {
  proof: FitchProof;
  currentProof: FitchProof;
  from: string;
  to: string;
  onConfirm: (next: FitchProof) => void;
  onCancel: () => void;
}) {
  const range = fitchLineRange(proof, from, to);
  const error =
    proof !== currentProof
      ? 'The proof changed while this selection was open. Keep proof work and select the lines again.'
      : !range
        ? 'The selected lines are no longer available.'
        : range.error;

  return (
    <ProofDeletionPrompt modal label="Delete selected lines?" onCancel={onCancel}>
      {range && (
        <>
          <p>
            Delete{' '}
            {range.steps.length === 1
              ? `line ${range.start + 1}`
              : `lines ${range.start + 1}–${range.end + 1}`}
            ?
          </p>
          <ol className="fitch-range-preview" start={range.start + 1}>
            {range.steps.map((step) => (
              <li key={step.id}>
                <code>{proofNotation(step.formula) || '(blank)'}</code>
              </li>
            ))}
          </ol>
          <p>
            {range.next.steps.length
              ? 'The other lines stay in place and are renumbered. Citations to deleted lines remain missing until you repair them.'
              : 'This removes all entered lines and subproofs, leaving an empty proof.'}
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
        disabled={Boolean(error) || !range}
        onClick={() => range && !error && onConfirm(range.next)}
      >
        Delete selected lines
      </button>
      <button type="button" className="secondary" onClick={onCancel}>
        Keep proof work
      </button>
    </ProofDeletionPrompt>
  );
}
