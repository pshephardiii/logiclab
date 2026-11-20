import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Center loaded trees on the trunk; preserve manual panning through edits and new rows. */
export function TruthTreeViewport({
  children,
  scrollable,
}: {
  children: ReactNode;
  scrollable: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = viewport.current!;
    let previousWidth = -1;

    function centerOnResize() {
      if (element.clientWidth === previousWidth) return;

      previousWidth = element.clientWidth;
      element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
    }

    centerOnResize();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(centerOnResize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewport}
      className="truth-tree-scroll"
      role="group"
      aria-label="Tree diagram"
      tabIndex={scrollable ? 0 : undefined}
    >
      {children}
    </div>
  );
}
