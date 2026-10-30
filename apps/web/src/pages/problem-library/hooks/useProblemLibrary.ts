import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useState } from 'react';
import type { ProblemArchiveFilter } from '@logiclab/contracts';
import type {
  CreateLibraryProblemRequest,
  LibraryProblemDraft,
} from '@logiclab/contracts/problem-library';
import * as apiModule from '../../../api/problems/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Owns library pagination and mutations; separate request lifecycles prevent stale list updates. */
export function useProblemLibrary() {
  const api = useResourceApi(apiModule);
  const [filter, setFilter] = useState<ProblemArchiveFilter>('active');
  const [problems, setProblems] = useState<LibraryProblemDraft[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<LibraryProblemDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    [api, filter, list.startRequest],
  );
  useEffect(() => {
    void load();
    return list.cancelRequest;
  }, [load, list.cancelRequest]);

  async function mutate(
    operation: (signal: AbortSignal) => Promise<LibraryProblemDraft>,
    message: string,
    saving = false,
  ) {
    const signal = action.startRequest();
    list.cancelRequest();
    setLoading(false);
    setBusy(true);
    setError(null);
    setSaveError(null);
    setNotice(null);
    try {
      const problem = await operation(signal);
      if (signal.aborted) return false;
      setSelected(problem);
      setNotice(message);
      await load();
      return true;
    } catch (caught) {
      if (!signal.aborted) {
        const message = caught instanceof Error ? caught.message : 'Could not save the problem.';
        if (saving) setSaveError(message);
        else setError(message);
      }
      return false;
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  function save(input: CreateLibraryProblemRequest) {
    return mutate((signal) => api.saveProblem(input, signal, selected?.id), 'Draft saved.', true);
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
    setSelected: (problem: LibraryProblemDraft | null) => {
      setSelected(problem);
      setSaveError(null);
    },
    loading,
    busy,
    error,
    saveError,
    notice,
    load,
    save,
    archive,
  };
}
