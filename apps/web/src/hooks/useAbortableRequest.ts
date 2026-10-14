import { useCallback, useEffect, useRef } from 'react';

/**
 * Manages one pending request per instance, canceling it on replacement or unmount.
 * Callers own state updates and must check the returned signal before applying results.
 */
export function useAbortableRequest() {
  const pending = useRef<AbortController | null>(null);

  const cancelRequest = useCallback(() => {
    pending.current?.abort();
  }, []);

  const startRequest = useCallback((): AbortSignal => {
    cancelRequest();
    const controller = new AbortController();
    pending.current = controller;
    return controller.signal;
  }, [cancelRequest]);

  useEffect(() => cancelRequest, [cancelRequest]);

  return { startRequest, cancelRequest };
}
