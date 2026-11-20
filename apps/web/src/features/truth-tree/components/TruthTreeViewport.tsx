import { useLayoutEffect, useRef, type ReactNode } from 'react';

export type TreeRevealRequest = { branchId: string; kind: 'entry' | 'branch' };

/** Center loaded trees on the trunk; preserve manual panning through edits and new rows. */
export function TruthTreeViewport({
  children,
  scrollable,
  reveal,
}: {
  children: ReactNode;
  scrollable: boolean;
  reveal?: TreeRevealRequest;
}) {
  const viewport = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = viewport.current!;
    let previousWidth = -1;

    function centerOnResize() {
      if (element.clientWidth === previousWidth) return;

      previousWidth = element.clientWidth;
      element.style.setProperty('--truth-tree-viewport-width', `${element.clientWidth}px`);
      element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
    }

    centerOnResize();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(centerOnResize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!reveal) return;

    let observer: ResizeObserver | undefined;
    let resizeFrame: number | undefined;
    // Reveal after modal cleanup/DOM movement, so stale focus restoration cannot win.
    const frame = requestAnimationFrame(() => {
      const attribute = reveal.kind === 'entry' ? 'data-tree-entry' : 'data-tree-branch-action';
      const target = [...viewport.current!.querySelectorAll<HTMLElement>(`[${attribute}]`)].find(
        (element) => element.getAttribute(attribute) === reveal.branchId,
      );
      if (!target) return;

      const focus =
        reveal.kind === 'entry'
          ? target.querySelector<HTMLElement>(
              'select:not(:disabled), input:not(:disabled), button:not(:disabled)',
            )
          : target;
      focus?.focus({ preventScroll: true });
      target.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'auto' });

      // Choosing a rule adds result fields. Keep confirmation visible without stealing the caret.
      if (reveal.kind === 'entry' && typeof ResizeObserver !== 'undefined') {
        let width = target.clientWidth;
        let height = target.clientHeight;
        observer = new ResizeObserver(() => {
          if (target.clientWidth === width && target.clientHeight === height) return;

          width = target.clientWidth;
          height = target.clientHeight;
          if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => {
            target.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'auto' });
          });
        });
        observer.observe(target);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
    };
  }, [reveal]);

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
