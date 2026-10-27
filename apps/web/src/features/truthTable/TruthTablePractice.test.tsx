import type { Ref } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { usePracticeContext } from './PracticeProvider';
import { TruthTablePractice } from './TruthTablePractice';

vi.mock('./PracticeProvider', () => ({ usePracticeContext: vi.fn() }));
vi.mock('./components/FormulaForm', () => ({ FormulaForm: () => <div>Formula entry</div> }));
vi.mock('./components/ExercisePanel', () => ({
  ExercisePanel: ({ panelRef }: { panelRef: Ref<HTMLElement> }) => (
    <section ref={panelRef}>Your truth table</section>
  ),
}));

const scroll = vi.fn();
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
const exercise = { variables: [], columns: [], rows: [] };

function practice(table: typeof exercise | null, loading = false, error: string | null = null) {
  vi.mocked(usePracticeContext).mockReturnValue({
    exercise: table,
    loading,
    error,
  } as ReturnType<typeof usePracticeContext>);
}

beforeEach(() => {
  scroll.mockClear();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scroll,
  });
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalScroll)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

test('scrolls only when a new successful exercise arrives, not on loading, errors or answer checks', () => {
  practice(null);
  const view = render(<TruthTablePractice />);
  practice(null, true);
  view.rerender(<TruthTablePractice />);
  practice(null, false, 'Invalid formula');
  view.rerender(<TruthTablePractice />);
  expect(scroll).not.toHaveBeenCalled();
  practice(exercise);
  view.rerender(<TruthTablePractice />);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' });
  view.rerender(<TruthTablePractice />);
  expect(scroll).toHaveBeenCalledTimes(1);
  practice(null);
  view.rerender(<TruthTablePractice />);
  practice({ ...exercise });
  view.rerender(<TruthTablePractice />);
  expect(scroll).toHaveBeenCalledTimes(2);
});

test('does not scroll when mounting a retained practice table', () => {
  practice(exercise);
  render(<TruthTablePractice />);
  expect(scroll).not.toHaveBeenCalled();
});

test('respects reduced motion without moving keyboard focus', () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  practice(null);
  const view = render(<TruthTablePractice />);
  const previousFocus = document.activeElement;
  practice(exercise);
  view.rerender(<TruthTablePractice />);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant', block: 'start' });
  expect(document.activeElement).toBe(previousFocus);
});
