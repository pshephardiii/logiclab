import { useCallback, useEffect, useState } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
import type { ClassroomListResponse } from '@logiclab/contracts';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Loads class choices using the caller’s owned/enrolled-class client with explicit pagination and retry. */
export function useClassChoices(
  loadPage: (signal: AbortSignal, offset?: number) => Promise<ClassroomListResponse>,
) {
  const [classes, setClasses] = useState<ClassroomSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startRequest, cancelRequest } = useAbortableRequest();
  const load = useCallback(
    async (offset = 0) => {
      const signal = startRequest();
      setLoading(true);
      setError(null);
      try {
        const page = await loadPage(signal, offset);
        if (!signal.aborted) {
          setClasses((previous) =>
            offset
              ? [
                  ...previous,
                  ...page.classrooms.filter((item) => !previous.some((old) => old.id === item.id)),
                ]
              : page.classrooms,
          );
          setNext(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setError(caught instanceof Error ? caught.message : 'Could not load classes.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [loadPage, startRequest],
  );
  useEffect(() => {
    void load();
    return cancelRequest;
  }, [load, cancelRequest]);
  return { classes, next, loading, error, load };
}
