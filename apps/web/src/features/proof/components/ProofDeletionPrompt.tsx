import { useEffect, useId, useRef, type ReactNode } from 'react';
import './proof-deletion-prompt.css';

/** Individual entries use a native modal; whole-proof/subproof prompts retain their current flow. */
export function ProofDeletionPrompt({
  modal,
  label,
  onCancel,
  children,
}: {
  modal: boolean;
  label: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();

  useEffect(() => {
    if (!modal) return;

    const element = dialog.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const editor = previous?.closest('.proof-editor');
    const restore =
      previous
        ?.closest('tr, [data-proof-node]')
        ?.querySelector<HTMLElement>('button[aria-controls]') ?? previous;
    element.showModal();
    element.querySelector<HTMLButtonElement>('button.secondary')?.focus();

    return () => {
      element.close();
      if (restore?.isConnected) restore.focus();
      else
        editor?.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)')?.focus();
    };
  }, [modal]);

  if (!modal)
    return (
      <div role="group" aria-label={label}>
        {children}
      </div>
    );

  return (
    <dialog
      ref={dialog}
      className="proof-deletion-prompt"
      aria-label={label}
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={title}>{label}</h2>
      <div className="proof-deletion-actions">{children}</div>
    </dialog>
  );
}
