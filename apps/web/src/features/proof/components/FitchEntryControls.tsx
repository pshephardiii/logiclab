import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';
import { fitchProofDepth } from '../helpers/fitch-editor';

/** Controlled scope and insertion controls; the editor owns closure, reopening and pending work. */
export function FitchEntryControls({
  proof,
  scope,
  before,
  disabled,
  pending,
  onOpen,
  onClose,
  onReopen,
  onAppend,
}: {
  proof: FitchProof;
  scope: string | null;
  before: string | null;
  disabled: boolean;
  pending: boolean;
  onOpen: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  onAppend: () => void;
}) {
  const activeBlock = proof.blocks.find((block) => block.id === scope);

  return (
    <>
      <fieldset disabled={disabled} className="fitch-entry-options">
        <p
          className="fitch-current-scope"
          aria-label="Current proof scope"
          data-scope-id={scope ?? ''}
        >
          {activeBlock
            ? `Inside subproof starting at line ${proof.steps.findIndex((step) => step.id === activeBlock.assumptionId) + 1 || '?'}${before === null ? ' — close it to continue in the parent proof.' : ''}`
            : scope
              ? 'Unavailable subproof scope'
              : 'Main proof'}
        </p>
        <button
          type="button"
          className="secondary"
          disabled={
            proof.steps.length >= PROOF_LIMITS.maxSteps ||
            proof.blocks.length >= PROOF_LIMITS.maxBlocks ||
            (fitchProofDepth(proof, scope) ?? PROOF_LIMITS.maxBlockDepth) >=
              PROOF_LIMITS.maxBlockDepth
          }
          onClick={onOpen}
        >
          Open subproof
        </button>
        <button type="button" className="secondary" disabled={!onClose} onClick={onClose}>
          Close subproof
        </button>
        {onReopen && (
          <button type="button" className="secondary" onClick={onReopen}>
            Reopen subproof
          </button>
        )}
      </fieldset>
      {before && (
        <p className="help">
          Inserting before line {proof.steps.findIndex((step) => step.id === before) + 1 || '?'}.
          <button type="button" className="text-button" disabled={pending} onClick={onAppend}>
            Append at end instead
          </button>
        </p>
      )}
    </>
  );
}
