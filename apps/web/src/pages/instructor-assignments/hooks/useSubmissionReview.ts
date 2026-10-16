import { useCallback, useEffect, useState } from 'react';
import type { SubmissionSummary, SubmissionReview } from '@logiclab/contracts';
import { listSubmissions, readSubmission } from '../../../api/submission-review/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Lists only final submissions; independent detail reads are canceled on selection changes. */
export function useSubmissionReview(assignmentId: string) {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [review, setReview] = useState<SubmissionReview | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reads = useAbortableRequest();
  const details = useAbortableRequest();
  const load = useCallback(
    async (offset = 0) => {
      const signal = reads.startRequest();
      setLoading(true);
      setError(null);
      try {
        const page = await listSubmissions(assignmentId, offset, signal);
        if (!signal.aborted) {
          setSubmissions((previous) =>
            offset
              ? [
                  ...previous,
                  ...page.submissions.filter((item) => !previous.some((old) => old.id === item.id)),
                ]
              : page.submissions,
          );
          setNext(page.nextOffset);
        }
      } catch (caught) {
        if (!signal.aborted)
          setError(caught instanceof Error ? caught.message : 'Could not load submissions.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [assignmentId, reads.startRequest],
  );
  useEffect(() => {
    void load();
    return reads.cancelRequest;
  }, [load, reads.cancelRequest]);
  async function select(id: string) {
    const signal = details.startRequest();
    setSelected(id);
    setReview(null);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await readSubmission(assignmentId, id, signal);
      if (!signal.aborted) setReview(response);
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not load this submission.');
    } finally {
      if (!signal.aborted) setDetailLoading(false);
    }
  }
  return { submissions, next, review, selected, loading, detailLoading, error, load, select };
}
