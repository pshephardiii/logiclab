import { ProofDeletionPrompt } from './ProofDeletionPrompt';

type Props = {
  reference: boolean;
  kind: 'line' | 'block' | 'proof';
  deletedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The editor retains the pending deletion, affected-line calculation and mutation. */
export function FitchProofDeletionConfirmation({
  reference,
  kind,
  deletedCount,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ProofDeletionPrompt
      modal={kind === 'line'}
      label={reference ? 'Confirm reference deletion' : 'Confirm proof deletion'}
      onCancel={onCancel}
    >
      <p>
        Delete {deletedCount} {reference ? 'reference' : 'proof'} line(s)
        {kind === 'block'
          ? ' and this subproof with its nested blocks'
          : kind === 'proof'
            ? ' and all subproofs'
            : ''}
        ? Surviving citations will remain missing until you repair them. This changes the local
        draft; save explicitly to persist.
      </p>
      <button type="button" className="danger" onClick={onConfirm}>
        Confirm deletion
      </button>
      <button type="button" className="secondary" onClick={onCancel}>
        {reference ? 'Keep reference work' : 'Keep proof work'}
      </button>
    </ProofDeletionPrompt>
  );
}
