import { ProofDeletionPrompt } from '../../proof/components/ProofDeletionPrompt';

export function TruthTreeUndoDialog({
  disabled,
  onConfirm,
  onCancel,
}: {
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ProofDeletionPrompt modal label="Undo last expansion?" onCancel={onCancel}>
      <p>
        Remove the latest expansion and its resulting formulas or child branches. Any closure on the
        affected branches is removed too.
      </p>
      <button type="button" disabled={disabled} onClick={onConfirm}>
        Undo expansion
      </button>
      <button type="button" className="secondary" onClick={onCancel}>
        Keep expansion
      </button>
    </ProofDeletionPrompt>
  );
}
