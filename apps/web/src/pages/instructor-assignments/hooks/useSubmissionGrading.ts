import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssignmentScore, SubmissionGradingResponse } from '@logiclab/contracts';
import { useResourceApi } from '../../../api/ResourceApiProvider';
import * as gradingApi from '../../../api/submission-review/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';
import {
  changedGradingItems,
  gradingDraftChanges,
  submissionGradingDraft,
  type GradingDraft,
} from '../helpers/submission-grading-draft';

/** Owns explicit grade edits. An unconfirmed write requires reconciliation, never automatic replay. */
export function useSubmissionGrading(
  assignmentId: string,
  submissionId: string,
  automaticScore: AssignmentScore,
  onUpdated: (id: string, value: SubmissionGradingResponse) => void,
) {
  // The panel is keyed by submission; this original snapshot stays fixed across parent score updates.
  const [frozenScore] = useState(automaticScore);
  const { readGrading, saveGrading } = useResourceApi(gradingApi);
  const requests = useAbortableRequest();
  const busyRef = useRef(false);
  const [current, setCurrent] = useState<SubmissionGradingResponse | null>(null);
  const [baseline, setBaseline] = useState<GradingDraft[]>([]);
  const [draft, setDraft] = useState<GradingDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accept = useCallback(
    (value: SubmissionGradingResponse) => {
      const next = submissionGradingDraft(frozenScore, value.grading);

      setCurrent(value);
      setBaseline(next);
      setDraft(next);
      setNeedsReload(false);

      onUpdated(submissionId, value);
    },
    [frozenScore, onUpdated, submissionId],
  );

  const load = useCallback(async () => {
    const signal = requests.startRequest();

    busyRef.current = true;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const value = await readGrading(assignmentId, submissionId, signal);

      if (!signal.aborted) accept(value);
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not load grading.');
    } finally {
      if (!signal.aborted) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, [assignmentId, submissionId, readGrading, requests.startRequest, accept]);

  useEffect(() => {
    void load();
    return requests.cancelRequest;
  }, [load, requests.cancelRequest]);

  const changes = gradingDraftChanges(draft, baseline, frozenScore);
  const dirty = changedGradingItems(draft, baseline).length > 0;

  function change(itemId: string, patch: Partial<Omit<GradingDraft, 'itemId'>>) {
    if (busyRef.current || needsReload) return;

    setNotice(null);
    setDraft((previous) =>
      previous.map((item) => (item.itemId === itemId ? { ...item, ...patch } : item)),
    );
  }

  async function save() {
    if (!current || busyRef.current || needsReload || !dirty || Object.keys(changes.errors).length)
      return false;

    const signal = requests.startRequest();

    busyRef.current = true;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const value = await saveGrading(
        assignmentId,
        submissionId,
        { revision: current.grading.revision, items: changes.items },
        signal,
      );

      if (signal.aborted) return false;

      accept(value);

      setNotice('Instructor grading saved.');
      return true;
    } catch (caught) {
      if (!signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'Could not confirm the grading save.');
        setNeedsReload(true);
      }

      return false;
    } finally {
      if (!signal.aborted) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  return {
    current,
    draft,
    dirty,
    busy,
    needsReload,
    error,
    notice,
    errors: changes.errors,
    load,
    change,
    save,
  };
}
