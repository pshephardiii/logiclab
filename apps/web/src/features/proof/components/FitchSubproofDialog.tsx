import { useEffect, useId, useRef, type ComponentProps } from 'react';
import { FitchProofBlockControls } from './FitchProofBlockControls';
import './fitch-subproof-dialog.css';

type Props = ComponentProps<typeof FitchProofBlockControls> & { onClose: () => void };

/** Settings apply immediately to local work; closing this modal neither saves nor checks. */
export function FitchSubproofDialog({ onClose, ...controls }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const title = useId();

  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restore =
      previous?.closest('tr')?.querySelector<HTMLElement>('button[aria-controls]') ?? previous;
    element.showModal();
    heading.current?.focus();

    return () => {
      element.close();
      if (restore?.isConnected) restore.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="fitch-subproof-dialog"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLSelectElement)
          event.preventDefault();
      }}
    >
      <h2 ref={heading} id={title} tabIndex={-1}>
        Subproof settings
      </h2>
      <FitchProofBlockControls {...controls} />
      <button type="button" className="secondary" onClick={onClose}>
        Done
      </button>
    </dialog>
  );
}
