import { useCallback, useEffect, useState } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
import { listClassrooms } from '../../../api/classrooms/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Loads the instructor's owned class choices with explicit pagination and retry. */
export function useAssignmentClasses() {
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
        const page = await listClassrooms(signal, offset);
        if (!signal.aborted) {
          setClasses((previous) => (offset ? [...previous, ...page.classrooms] : page.classrooms));
          setNext(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setError(caught instanceof Error ? caught.message : 'Could not load classes.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [startRequest],
  );
  useEffect(() => {
    void load();
    return cancelRequest;
  }, [load, cancelRequest]);
  return { classes, next, loading, error, load };
}
