import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** Nested native popover stays above the proof scroll container; buttons retain normal Tab behavior. */
export function ProofSubmenu({
  label,
  parentOpen,
  children,
}: {
  label: string;
  parentOpen: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusOnOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function cancelTimer() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  function hide(restore = false) {
    cancelTimer();
    panel.current?.hidePopover();
    if (restore) trigger.current?.focus();
  }

  function focusFirst() {
    panel.current
      ?.querySelector<HTMLButtonElement>('.proof-submenu-options button:not(:disabled)')
      ?.focus();
  }

  function show(focus: boolean) {
    if (!parentOpen || !trigger.current || !panel.current) return;
    cancelTimer();
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(288, innerWidth - 24);
    const height = Math.min(panel.current.scrollHeight || 240, innerHeight - 24, 320);
    const right = rect.right + 4;
    const left = right + width <= innerWidth - 12 ? right : rect.left - width - 4;
    setPosition({
      left: Math.max(12, Math.min(left, innerWidth - width - 12)),
      top: Math.max(12, Math.min(rect.top, innerHeight - height - 12)),
    });
    focusOnOpen.current = focus;
    if (open) {
      if (focus) focusFirst();
    } else panel.current.showPopover();
  }

  function leave() {
    cancelTimer();
    // A short bridge lets a pointer cross the gap into either left- or right-opening panels.
    timer.current = setTimeout(() => {
      if (!panel.current?.contains(document.activeElement)) hide();
    }, 160);
  }

  useEffect(() => {
    if (!parentOpen) hide();
  }, [parentOpen]);

  useEffect(() => () => cancelTimer(), []);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      hide();
    };
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);

  return (
    <div
      className="proof-submenu"
      onPointerLeave={leave}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        )
          return;
        hide();
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="proof-submenu-trigger"
        aria-expanded={open}
        aria-controls={id}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') show(false);
        }}
        onClick={() => show(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            show(true);
          }
        }}
      >
        <span>{label}</span>
        <span aria-hidden="true">›</span>
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="group"
        aria-label={`${label} options`}
        aria-hidden={!open}
        className="proof-dropdown-panel proof-submenu-panel"
        style={position}
        onPointerEnter={cancelTimer}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'ArrowLeft') {
            event.preventDefault();
            event.stopPropagation();
            hide(true);
          }
        }}
        onToggle={(event) => {
          if (event.target !== event.currentTarget) return;
          const next = event.newState === 'open';
          setOpen(next);
          if (next && focusOnOpen.current) focusFirst();
        }}
      >
        <button type="button" className="proof-submenu-back" onClick={() => hide(true)}>
          ‹ Back to line actions
        </button>
        <div className="proof-submenu-options">{children}</div>
      </div>
    </div>
  );
}
