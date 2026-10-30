import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useState } from 'react';
import type { LibraryProblemVersion } from '@logiclab/contracts/problem-library';
import * as problemsApi from '../../../api/problems/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Owns paginated history and explicit publication, without automatically retrying writes. */
export function useProblemHistory(problemId: string) {
  const { listVersions, publishProblem } = useResourceApi(problemsApi);
  const [versions, setVersions] = useState<LibraryProblemVersion[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reads = useAbortableRequest();
  const writes = useAbortableRequest();
  const load = useCallback(
    async (offset = 0) => {
      const signal = reads.startRequest();
      setLoading(true);
      setError(null);
      try {
        const page = await listVersions(problemId, offset, signal);
        if (!signal.aborted) {
          setVersions((previous) => (offset ? [...previous, ...page.versions] : page.versions));
          setNext(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setError(caught instanceof Error ? caught.message : 'Could not load history.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [listVersions, problemId, reads.startRequest],
  );
  useEffect(() => {
    void load();
    return reads.cancelRequest;
  }, [load, reads.cancelRequest]);
  async function publish() {
    const signal = writes.startRequest();
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const version = await publishProblem(problemId, signal);
      if (!signal.aborted) {
        setNotice(`Published version ${version.version}.`);
        await load();
      }
    } catch (caught) {
      if (!signal.aborted)
        setError(
          `${caught instanceof Error ? caught.message : 'Publication could not be confirmed.'} Reload history before trying again: the publication may have succeeded.`,
        );
    } finally {
      if (!signal.aborted) setPublishing(false);
    }
  }
  return { versions, next, loading, publishing, error, notice, load, publish };
}
