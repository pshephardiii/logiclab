import { useCallback, useEffect, useState } from 'react';
import type { CreateProblemRequest, ProblemArchiveFilter, ProblemDraft } from '@logiclab/contracts';
import * as api from '../../../api/problems/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Owns library pagination and mutations; separate request lifecycles prevent stale list updates. */
export function useProblemLibrary() {
  const [filter, setFilter] = useState<ProblemArchiveFilter>('active');
  const [problems, setProblems] = useState<ProblemDraft[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<ProblemDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useAbortableRequest();
  const action = useAbortableRequest();
  const load = useCallback(
    async (offset = 0) => {
      const signal = list.startRequest();
      setLoading(true);
      setError(null);
      try {
        const page = await api.listProblems(filter, offset, signal);
        if (!signal.aborted) {
          setProblems((previous) =>
            offset === 0
              ? page.problems
              : [
                  ...previous,
                  ...page.problems.filter((item) => !previous.some((old) => old.id === item.id)),
                ],
          );
          setNextOffset(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setError(caught instanceof Error ? caught.message : 'Could not load the library.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [filter, list.startRequest],
  );
  useEffect(() => {
    void load();
    return list.cancelRequest;
  }, [load, list.cancelRequest]);

  async function mutate(
    operation: (signal: AbortSignal) => Promise<ProblemDraft>,
    message: string,
  ) {
    const signal = action.startRequest();
    list.cancelRequest();
    setLoading(false);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const problem = await operation(signal);
      if (signal.aborted) return false;
      setSelected(problem);
      setNotice(message);
      await load();
      return true;
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not save the problem.');
      return false;
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  function save(input: CreateProblemRequest) {
    return mutate((signal) => api.saveProblem(input, signal, selected?.id), 'Draft saved.');
  }
  function archive() {
    if (!selected) return;
    return mutate(
      (signal) => api.archiveProblem(selected.id, !selected.archivedAt, signal),
      selected.archivedAt ? 'Problem restored.' : 'Problem archived.',
    );
  }
  return {
    filter,
    setFilter,
    problems,
    nextOffset,
    selected,
    setSelected,
    loading,
    busy,
    error,
    notice,
    load,
    save,
    archive,
  };
}
