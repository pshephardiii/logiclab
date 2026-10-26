import { useEffect, useRef } from 'react';
import './discard-changes-dialog.css';

type Props = { onStay: () => void; onDiscard: () => void };

/** Native modal supplies focus containment; Escape takes the non-destructive Stay action. */
export function DiscardChangesDialog({ onStay, onDiscard }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="discard-changes-dialog"
      aria-labelledby="discard-changes-title"
      aria-describedby="discard-changes-description"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <h2 id="discard-changes-title">Discard unsaved changes?</h2>
      <p id="discard-changes-description">Leaving this page will discard your unsaved changes.</p>
      <div className="action-row">
        <button autoFocus onClick={onStay}>
          Stay
        </button>
        <button className="secondary" onClick={onDiscard}>
          Discard changes
        </button>
      </div>
    </dialog>
  );
}
