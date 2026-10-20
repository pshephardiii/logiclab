import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useState } from 'react';
import type { AssignmentSummary } from '@logiclab/contracts';
import * as studentWorkApi from '../../../api/student-work/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

export function useStudentAssignments(classId: string) {
  const { listAssignedWork } = useResourceApi(studentWorkApi);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startRequest, cancelRequest } = useAbortableRequest();
  const load = useCallback(
    async (offset = 0) => {
      const signal = startRequest();
      setLoading(true);
      setError(null);
      try {
        const page = await listAssignedWork(classId, offset, signal);
        if (!signal.aborted) {
          setAssignments((previous) =>
            offset
              ? [
                  ...previous,
                  ...page.assignments.filter((item) => !previous.some((old) => old.id === item.id)),
                ]
              : page.assignments,
          );
          setNext(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setError(caught instanceof Error ? caught.message : 'Could not load assignments.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [listAssignedWork, classId, startRequest],
  );
  useEffect(() => {
    void load();
    return cancelRequest;
  }, [load, cancelRequest]);
  return { assignments, next, loading, error, load };
}
