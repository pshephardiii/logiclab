import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AssignmentDetail,
  AssignmentSummary,
  AssignmentListQuery,
  CreateAssignmentRequest,
} from '@logiclab/contracts';
import * as apiModule from '../../../api/assignments/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Owns a single class's assignments; list, detail, and mutation requests have independent lifecycles. */
export function useAssignments(classId: string) {
  const api = useResourceApi(apiModule);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [filter, setFilter] = useState<AssignmentListQuery['archive']>('active');
  const [next, setNext] = useState<number | null>(null);
  const [selected, setSelected] = useState<AssignmentDetail | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reads = useAbortableRequest();
  const details = useAbortableRequest();
  const writes = useAbortableRequest();
  const mutationPending = useRef(false);
  const load = useCallback(
    async (offset = 0) => {
      const signal = reads.startRequest();
      setLoading(true);
      setError(null);
      try {
        const page = await api.listAssignments(classId, filter, offset, signal);
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
    [api, classId, filter, reads.startRequest],
  );
  useEffect(() => {
    void load();
    return reads.cancelRequest;
  }, [load, reads.cancelRequest]);

  async function select(id: string | null) {
    const signal = details.startRequest();
    setSelected(null);
    setEditingId(id);
    setNotice(null);
    setError(null);
    setRevision((value) => value + 1);
    if (!id) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    try {
      const assignment = await api.getAssignment(id, signal);
      if (!signal.aborted) setSelected(assignment);
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not load the assignment.');
    } finally {
      if (!signal.aborted) setDetailLoading(false);
    }
  }

  async function mutate(
    operation: (signal: AbortSignal) => Promise<AssignmentDetail>,
    message: string,
    failureHint = '',
  ) {
    if (mutationPending.current) return false;
    mutationPending.current = true;
    const signal = writes.startRequest();
    reads.cancelRequest();
    details.cancelRequest();
    setLoading(false);
    setDetailLoading(false);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const assignment = await operation(signal);
      if (signal.aborted) return false;
      setSelected(assignment);
      setEditingId(assignment.id);
      setRevision((value) => value + 1);
      setNotice(message);
      await load();
      return true;
    } catch (caught) {
      if (!signal.aborted) {
        const reason =
          caught instanceof Error ? caught.message : 'Could not update the assignment.';
        setError(failureHint ? `${reason} ${failureHint}` : reason);
      }
      return false;
    } finally {
      mutationPending.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  function save(input: CreateAssignmentRequest, itemsChanged: boolean) {
    const { problemVersionIds, ...metadata } = input;
    return mutate(
      (signal) =>
        selected
          ? api.updateAssignment(
              selected.id,
              { ...metadata, ...(itemsChanged ? { problemVersionIds } : {}) },
              signal,
            )
          : api.createAssignment(classId, input, signal),
      'Assignment draft saved.',
    );
  }
  function duplicate() {
    if (!selected || busy) return;
    return mutate(
      (signal) => api.assignmentAction(selected.id, 'duplicate', signal),
      'Assignment duplicated as a new draft.',
      'Duplication could not be confirmed. Reload Active or All assignments and check for a copy before trying again; another request creates another draft.',
    );
  }
  function act(action: 'publish' | 'archive' | 'restore') {
    if (!selected) return;
    return mutate(
      (signal) => api.assignmentAction(selected.id, action, signal),
      action === 'publish'
        ? 'Assignment published. Content and policy are locked.'
        : action === 'archive'
          ? 'Assignment archived.'
          : 'Assignment restored.',
    );
  }
  return {
    assignments,
    filter,
    setFilter,
    next,
    selected,
    editingId,
    revision,
    loading,
    detailLoading,
    busy,
    error,
    notice,
    load,
    select,
    save,
    duplicate,
    act,
  };
}
