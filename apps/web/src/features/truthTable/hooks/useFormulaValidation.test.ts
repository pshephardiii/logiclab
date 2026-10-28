import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { FORMULA_VALIDATION_DELAY_MS, useFormulaValidation } from './useFormulaValidation';

afterEach(() => vi.useRealTimers());

test('waits for a typing pause and clears stale feedback immediately on edit', () => {
  vi.useFakeTimers();
  const view = renderHook(({ formula }) => useFormulaValidation(formula), {
    initialProps: { formula: 'P &' },
  });
  act(() => vi.advanceTimersByTime(FORMULA_VALIDATION_DELAY_MS - 1));
  expect(view.result.current).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(view.result.current).toMatchObject({ valid: false });
  expect(view.result.current?.message).toContain('character');
  view.rerender({ formula: 'P & Q' });
  expect(view.result.current).toBeNull();
  act(() => vi.advanceTimersByTime(FORMULA_VALIDATION_DELAY_MS));
  expect(view.result.current).toMatchObject({ valid: true });
});

test('only validates the latest edit and cancels timers on clear or unmount', () => {
  vi.useFakeTimers();
  const view = renderHook(({ formula }) => useFormulaValidation(formula), {
    initialProps: { formula: 'P &' },
  });
  view.rerender({ formula: 'P v Q' });
  act(() => vi.advanceTimersByTime(FORMULA_VALIDATION_DELAY_MS));
  expect(view.result.current).toMatchObject({ formula: 'P v Q', valid: true });
  view.rerender({ formula: ' ' });
  act(() => vi.advanceTimersByTime(FORMULA_VALIDATION_DELAY_MS));
  expect(view.result.current).toBeNull();
  view.rerender({ formula: '(' });
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test.each([
  ['!(P & Q) -> (V v R)', true],
  ['[(P v Q) & ![R -> P]]', true],
  ['[P & Q)', false],
  ['P & Q & R & S & T', false],
  ['(P v Q', false],
  ['p', false],
])('uses shared parser rules for %s', (formula, valid) => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useFormulaValidation(formula));
  act(() => vi.advanceTimersByTime(FORMULA_VALIDATION_DELAY_MS));
  expect(result.current?.valid).toBe(valid);
});
