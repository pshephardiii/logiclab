import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './proof-dropdown.css';

/** Native top-layer popover escapes the proof's scroll area and supplies light dismissal/Escape. */
export function ProofDropdown({
  label,
  trigger,
  disabled = false,
  children,
}: {
  label: string;
  trigger: ReactNode;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const close = () => panel.current?.hidePopover();
    const scroll = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open]);

  function place() {
    if (!button.current || !panel.current) return;
    const rect = button.current.getBoundingClientRect();
    const height = Math.min(panel.current.scrollHeight || 240, innerHeight - 24, 320);
    const width = Math.min(288, innerWidth - 24);
    setPosition({
      top: Math.max(
        12,
        rect.bottom + height + 4 > innerHeight ? rect.top - height - 4 : rect.bottom + 4,
      ),
      left: Math.max(12, Math.min(rect.right - width, innerWidth - width - 12)),
    });
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className="proof-dropdown-trigger"
        disabled={disabled}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          place();
          panel.current?.togglePopover();
        }}
      >
        {trigger}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        className="proof-dropdown-panel"
        role="group"
        aria-label={label}
        aria-hidden={!open}
        style={position}
        onToggle={(event) => {
          const next = event.newState === 'open';
          setOpen(next);
          if (next) {
            place();
            panel.current
              ?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)')
              ?.focus();
          }
        }}
      >
        {children(() => panel.current?.hidePopover())}
      </div>
    </>
  );
}
