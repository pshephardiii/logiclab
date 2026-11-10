import { useEffect, useRef, useState, type MouseEvent, type ComponentProps } from 'react';
import { ProofRulesDialog } from './ProofRulesDialog';

/** Share gesture isolation, grouping and modal focus between practice and instructor authoring. */
export function ProofRulePicker(props: Omit<ComponentProps<typeof ProofRulesDialog>, 'onClose'>) {
  const [open, setOpen] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function show(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    if (frame.current !== null) return;

    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setOpen(true);
    });
  }

  return (
    <>
      <button type="button" className="secondary" onClick={show}>
        Permitted rules ({props.selected.length} selected)
      </button>
      {open && <ProofRulesDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
