import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './proof-viewport.css';

/** Explain clipped proof columns without changing the reader's horizontal position. */
export function ProofViewport({
  children,
  className,
  label,
  hasContent,
}: {
  children: ReactNode;
  className: string;
  label: string;
  hasContent: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflow, setOverflow] = useState(false);
  const measure = useCallback(() => {
    const element = viewport.current;
    setOverflow(Boolean(hasContent && element && element.scrollWidth > element.clientWidth + 1));
  }, [hasContent]);

  // Entering citations can change table width without resizing the surrounding page.
  useLayoutEffect(measure, [measure, children]);
  useEffect(() => {
    const element = viewport.current!;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    const table = element.querySelector('table');
    if (table) observer?.observe(table);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return (
    <div className="proof-viewport">
      {overflow && (
        <p id={hintId} className="proof-scroll-hint">
          <span aria-hidden="true">↔</span> Scroll sideways to see the full proof.
        </p>
      )}
      <div
        ref={viewport}
        className={className}
        role="region"
        aria-label={label}
        aria-describedby={overflow ? hintId : undefined}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
