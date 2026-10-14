import { useCallback, useEffect, useRef } from 'react';

/** Manage one pending request per hook instance; callers own state and abort guards. */
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
