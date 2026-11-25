import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import '../sample-actions.css';

/** Public reference only: opening this view never changes or checks the visitor's attempt. */
export function CompletedSampleExample({
  title,
  introduction,
  children,
}: {
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  return (
    <div className="completed-sample">
      <button
        type="button"
        className="secondary"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide completed example' : 'View completed example'}
      </button>
      {open && (
        <section
          id={id}
          className="panel completed-sample-content"
          aria-label="Completed sample example"
        >
          <h2 ref={heading} tabIndex={-1}>
            Completed example
          </h2>
          <h3>{title}</h3>
          <p>{introduction}</p>
          <p className="help">This is the sample solution. Your own work is unchanged.</p>
          {children}
        </section>
      )}
    </div>
  );
}
