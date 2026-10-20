import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useState } from 'react';
import type { ProblemDraft, PublishedProblemVersion } from '@logiclab/contracts';
import * as problemsApi from '../../../api/problems/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Paginated library choices; switching problems cancels stale version reads. */
export function usePublishedProblemChoices() {
  const { listProblems, listVersions } = useResourceApi(problemsApi);
  const [problems, setProblems] = useState<ProblemDraft[]>([]);
  const [problemNext, setProblemNext] = useState<number | null>(null);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [problemId, setProblemId] = useState('');
  const [versions, setVersions] = useState<PublishedProblemVersion[]>([]);
  const [versionNext, setVersionNext] = useState<number | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const library = useAbortableRequest();
  const history = useAbortableRequest();
  const loadProblems = useCallback(
    async (offset = 0) => {
      const signal = library.startRequest();
      setProblemLoading(true);
      setProblemError(null);
      try {
        const page = await listProblems('all', offset, signal);
        if (!signal.aborted) {
          setProblems((previous) => (offset ? [...previous, ...page.problems] : page.problems));
          setProblemNext(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setProblemError(caught instanceof Error ? caught.message : 'Could not load the library.');
      } finally {
        if (!signal.aborted) setProblemLoading(false);
      }
    },
    [listProblems, library.startRequest],
  );
  useEffect(() => {
    void loadProblems();
    return library.cancelRequest;
  }, [loadProblems, library.cancelRequest]);
  const loadVersions = useCallback(
    async (offset = 0) => {
      const signal = history.startRequest();
      if (!problemId) {
        setVersionLoading(false);
        return;
      }
      setVersionLoading(true);
      setVersionError(null);
      try {
        const page = await listVersions(problemId, offset, signal);
        if (!signal.aborted) {
          setVersions((previous) => (offset ? [...previous, ...page.versions] : page.versions));
          setVersionNext(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setVersionError(caught instanceof Error ? caught.message : 'Could not load versions.');
      } finally {
        if (!signal.aborted) setVersionLoading(false);
      }
    },
    [listVersions, problemId, history.startRequest],
  );
  useEffect(() => {
    void loadVersions();
    return history.cancelRequest;
  }, [loadVersions, history.cancelRequest]);
  function selectProblem(id: string) {
    history.cancelRequest();
    setProblemId(id);
    setVersions([]);
    setVersionNext(null);
    setVersionError(null);
  }
  return {
    problems,
    problemNext,
    problemLoading,
    problemError,
    loadProblems,
    problemId,
    selectProblem,
    versions,
    versionNext,
    versionLoading,
    versionError,
    loadVersions,
  };
}
