import { StrictMode, useEffect } from 'react';
import { renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useAbortableRequest } from './useAbortableRequest';

test('replacement aborts previous work and callbacks remain stable across renders', () => {
  const hook = renderHook(() => useAbortableRequest());
  const callbacks = hook.result.current;
  const first = callbacks.startRequest();
  hook.rerender();
  expect(hook.result.current.startRequest).toBe(callbacks.startRequest);
  expect(hook.result.current.cancelRequest).toBe(callbacks.cancelRequest);
  const second = hook.result.current.startRequest();
  expect(first.aborted).toBe(true);
  expect(second.aborted).toBe(false);
  hook.result.current.cancelRequest();
  expect(second.aborted).toBe(true);
});

test('unmount cancels pending work without affecting another instance', () => {
  const first = renderHook(() => useAbortableRequest());
  const second = renderHook(() => useAbortableRequest());
  const firstSignal = first.result.current.startRequest();
  const secondSignal = second.result.current.startRequest();
  first.unmount();
  expect(firstSignal.aborted).toBe(true);
  expect(secondSignal.aborted).toBe(false);
  second.unmount();
  expect(secondSignal.aborted).toBe(true);
});

test('StrictMode effect replay cancels the obsolete request and keeps its replacement live', () => {
  const signals: AbortSignal[] = [];
  const hook = renderHook(
    () => {
      const request = useAbortableRequest();
      useEffect(() => {
        signals.push(request.startRequest());
      }, [request.startRequest]);
      return request;
    },
    { wrapper: StrictMode },
  );
  expect(signals).toHaveLength(2);
  expect(signals[0]!.aborted).toBe(true);
  expect(signals[1]!.aborted).toBe(false);
  hook.unmount();
  expect(signals[1]!.aborted).toBe(true);
});
