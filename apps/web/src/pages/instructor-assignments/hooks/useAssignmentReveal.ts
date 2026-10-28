import { useEffect, useRef, useState } from 'react';

/** Reserves editor space during a selection and reveals only the requested loaded assignment. */
export function useAssignmentReveal(selectedId: string | null, loading: boolean, revision: number) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingId = useRef<string | null>(null);
  const [reservedHeight, setReservedHeight] = useState(0);

  function prepareSelection(id: string | null) {
    pendingId.current = id;
    setReservedHeight(panelRef.current?.getBoundingClientRect().height ?? 0);
  }

  useEffect(() => {
    if (loading || !selectedId || pendingId.current !== selectedId) return;
    pendingId.current = null;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView?.({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'start',
    });
  }, [selectedId, loading, revision]);

  return { panelRef, reservedHeight, prepareSelection };
}
