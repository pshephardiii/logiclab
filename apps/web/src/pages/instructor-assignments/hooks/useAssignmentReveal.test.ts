import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useAssignmentReveal } from './useAssignmentReveal';

function setup(id: string | null = null) {
  const view = renderHook(
    ({ id, loading, revision }) => useAssignmentReveal(id, loading, revision),
    {
      initialProps: { id, loading: false, revision: 0 },
    },
  );
  const panel = document.createElement('div');
  const scroll = vi.fn();
  panel.scrollIntoView = scroll;
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ height: 720 } as DOMRect);
  view.result.current.panelRef.current = panel;
  return { ...view, scroll };
}

afterEach(() => vi.unstubAllGlobals());

test('reserves the old editor height and scrolls once after the requested detail loads', () => {
  const view = setup();
  act(() => view.result.current.prepareSelection('one'));
  expect(view.result.current.reservedHeight).toBe(720);
  view.rerender({ id: null, loading: true, revision: 0 });
  expect(view.scroll).not.toHaveBeenCalled();
  view.rerender({ id: 'one', loading: false, revision: 0 });
  expect(view.scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' });
  view.rerender({ id: 'one', loading: false, revision: 0 });
  expect(view.scroll).toHaveBeenCalledTimes(1);
});

test('does not scroll on failure, but permits a successful explicit retry', () => {
  const view = setup();
  act(() => view.result.current.prepareSelection('one'));
  view.rerender({ id: null, loading: true, revision: 0 });
  view.rerender({ id: null, loading: false, revision: 0 });
  expect(view.scroll).not.toHaveBeenCalled();
  act(() => view.result.current.prepareSelection('one'));
  view.rerender({ id: null, loading: true, revision: 0 });
  view.rerender({ id: 'one', loading: false, revision: 0 });
  expect(view.scroll).toHaveBeenCalledTimes(1);
});

test('only the latest selection can trigger a reveal; New assignment cancels it', () => {
  const view = setup();
  act(() => {
    view.result.current.prepareSelection('one');
    view.result.current.prepareSelection('two');
  });
  view.rerender({ id: 'one', loading: false, revision: 0 });
  expect(view.scroll).not.toHaveBeenCalled();
  view.rerender({ id: 'two', loading: false, revision: 0 });
  expect(view.scroll).toHaveBeenCalledTimes(1);
  act(() => {
    view.result.current.prepareSelection('one');
    view.result.current.prepareSelection(null);
  });
  view.rerender({ id: 'one', loading: false, revision: 0 });
  expect(view.scroll).toHaveBeenCalledTimes(1);
});

test('retained selections and save/publication results do not initiate scrolling', () => {
  const view = setup('one');
  view.rerender({ id: 'one', loading: false, revision: 0 });
  view.rerender({ id: 'two', loading: false, revision: 0 });
  expect(view.scroll).not.toHaveBeenCalled();
});

test('uses instant movement for reduced motion and leaves focus unchanged', () => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  const view = setup();
  const focus = document.activeElement;
  act(() => view.result.current.prepareSelection('one'));
  view.rerender({ id: 'one', loading: false, revision: 0 });
  expect(view.scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant', block: 'start' });
  expect(document.activeElement).toBe(focus);
});

test('reveals a fast reload of the same assignment without requiring a visible loading frame', () => {
  const view = setup('one');
  act(() => view.result.current.prepareSelection('one'));
  expect(view.scroll).not.toHaveBeenCalled();
  view.rerender({ id: 'one', loading: false, revision: 1 });
  expect(view.scroll).toHaveBeenCalledOnce();
});
