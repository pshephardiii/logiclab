import { ProofDeletionPrompt } from '../components/ProofDeletionPrompt';

/** Confirm full removal; proof state, focus requests and mutation remain in the editor. */
export function DependencyProofRemovalDialog({
  reference,
  onConfirm,
  onCancel,
}: {
  reference: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ProofDeletionPrompt modal label="Confirm proof deletion" onCancel={onCancel}>
      <p>{reference ? 'Remove the entire reference proof?' : 'Remove the entire proof?'}</p>
      <button type="button" className="danger" onClick={onConfirm}>
        Confirm deletion
      </button>
      <button type="button" className="secondary" onClick={onCancel}>
        Keep proof
      </button>
    </ProofDeletionPrompt>
  );
}
