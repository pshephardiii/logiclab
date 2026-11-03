import { appendPageById } from '../../../helpers/append-page-by-id';
import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useState } from 'react';
import type {
  SubmissionSummary,
  SubmissionReview,
  SubmissionGradingResponse,
} from '@logiclab/contracts';
import * as submissionReviewApi from '../../../api/submission-review/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Lists only final submissions; independent detail reads are canceled on selection changes. */
export function useSubmissionReview(assignmentId: string) {
  const { listSubmissions, readSubmission } = useResourceApi(submissionReviewApi);
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
            offset ? appendPageById(previous, page.submissions) : page.submissions,
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
    [listSubmissions, assignmentId, reads.startRequest],
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
  const applyGrading = useCallback(
    (id: string, value: SubmissionGradingResponse) => {
      reads.cancelRequest();
      setLoading(false);
      setSubmissions((previous) =>
        previous.map((row) => (row.id === id ? { ...row, score: value.score } : row)),
      );
      setReview((previous) => {
        if (!previous || previous.attempt.id !== id) return previous;
        const { automaticScore, instructorGrading: _grading, ...attempt } = previous.attempt;
        const original = automaticScore ?? attempt.score;
        return {
          ...previous,
          submission: { ...previous.submission, score: value.score },
          attempt: {
            ...attempt,
            score: value.score,
            ...(value.grading.revision > 0 && original
              ? {
                  automaticScore: original,
                  instructorGrading: {
                    gradingVersion: value.grading.gradingVersion,
                    revision: value.grading.revision,
                    items: value.grading.items.map(({ itemId, earnedPoints, comment }) => ({
                      itemId,
                      earnedPoints,
                      comment,
                    })),
                  },
                }
              : {}),
          },
        };
      });
    },
    [reads.cancelRequest],
  );
  return {
    submissions,
    next,
    review,
    selected,
    loading,
    detailLoading,
    error,
    load,
    select,
    applyGrading,
  };
}
