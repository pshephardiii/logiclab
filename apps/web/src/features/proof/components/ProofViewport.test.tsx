import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ProofViewport } from './ProofViewport';

afterEach(() => vi.unstubAllGlobals());

function content(hasContent = true) {
  return (
    <ProofViewport className="proof-display" label="Example proof" hasContent={hasContent}>
      <table>
        <tbody>
          <tr>
            <td>P</td>
          </tr>
        </tbody>
      </table>
    </ProofViewport>
  );
}

function size(viewport: HTMLElement, width: number, total: number) {
  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, value: width },
    scrollWidth: { configurable: true, value: total },
  });
}

test('reports actual overflow and removes the hint on resize without panning or stealing focus', () => {
  let resized!: () => void;
  const disconnect = vi.fn();
  const observe = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
  const view = render(content());
  const viewport = screen.getByRole('region', { name: 'Example proof' });
  expect(screen.queryByText(/Scroll sideways/)).not.toBeInTheDocument();
  size(viewport, 320, 640);
  viewport.scrollLeft = 90;
  viewport.focus();
  act(() => resized());
  const hint = screen.getByText(/Scroll sideways/);
  expect(viewport).toHaveAttribute('aria-describedby', hint.id);
  expect(viewport).toHaveFocus();
  expect(viewport.scrollLeft).toBe(90);
  expect(observe).toHaveBeenCalledWith(viewport);
  expect(observe).toHaveBeenCalledWith(viewport.querySelector('table'));
  size(viewport, 700, 640);
  act(() => resized());
  expect(screen.queryByText(/Scroll sideways/)).not.toBeInTheDocument();
  expect(viewport).not.toHaveAttribute('aria-describedby');
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

test('empty proofs stay quiet and window resize remains a fallback without ResizeObserver', () => {
  vi.stubGlobal('ResizeObserver', undefined);
  const view = render(content(false));
  const viewport = screen.getByRole('region', { name: 'Example proof' });
  size(viewport, 320, 640);
  fireEvent(window, new Event('resize'));
  expect(screen.queryByText(/Scroll sideways/)).not.toBeInTheDocument();
  view.rerender(content());
  expect(screen.getByText(/Scroll sideways/)).toBeInTheDocument();
  size(viewport, 800, 640);
  fireEvent(window, new Event('resize'));
  expect(screen.queryByText(/Scroll sideways/)).not.toBeInTheDocument();
});
