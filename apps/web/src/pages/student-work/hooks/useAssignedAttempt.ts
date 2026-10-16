import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  StudentAssignment,
  StudentAttempt,
  TruthTableSolutionResponse,
} from '@logiclab/contracts';
import type { Answers } from '../../../features/truthTable/types';
import { cellKey } from '../../../features/truthTable/types';
import { submittedAnswers } from '../../../features/truthTable/helpers/submitted-answers';
import { savedAnswerMaps, sameAnswers } from '../../../features/assignment/helpers/answers';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';
import * as api from '../../../api/student-work/api';

/** Keeps unsaved item edits separate from server revisions; no feedback is requested before final submission. */
export function useAssignedAttempt(assignmentId: string) {
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answers>>({});
  const [baseline, setBaseline] = useState<Record<string, Answers>>({});
  const [solutions, setSolutions] = useState<Record<string, TruthTableSolutionResponse>>({});
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'save' | 'submit' | 'solution' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reads = useAbortableRequest();
  const writes = useAbortableRequest();
  const dirty = useMemo(
    () => Object.keys(answers).filter((id) => !sameAnswers(answers[id]!, baseline[id])),
    [answers, baseline],
  );
  const load = useCallback(async () => {
    const signal = reads.startRequest();
    writes.cancelRequest();
    setAction(null);
    setLoading(true);
    setError(null);
    setNotice(null);
    setSolutions({});
    try {
      const result = await api.readAssignedWork(assignmentId, signal);
      if (!signal.aborted) {
        setAssignment(result.assignment);
        setAttempt(result.attempt);
        const saved = savedAnswerMaps(result.assignment, result.attempt);
        setAnswers(saved);
        setBaseline(saved);
      }
    } catch (caught) {
      if (!signal.aborted) {
        setAssignment(null);
        setError(caught instanceof Error ? caught.message : 'Could not load work.');
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [assignmentId, reads.startRequest, writes.cancelRequest]);
  useEffect(() => {
    void load();
    return reads.cancelRequest;
  }, [load, reads.cancelRequest]);
  function changeAnswer(itemId: string, row: string, column: string, value: boolean | null) {
    if (action || attempt?.submittedAt) return;
    setNotice(null);
    setAnswers((previous) => ({
      ...previous,
      [itemId]: { ...previous[itemId], [cellKey(row, column)]: value },
    }));
  }
  async function save(itemId: string) {
    if (!assignment || action || attempt?.submittedAt) return;
    const item = assignment.items.find((value) => value.id === itemId);
    if (!item) return;
    const snapshot = answers[itemId]!;
    const signal = writes.startRequest();
    setAction('save');
    setError(null);
    setNotice(null);
    try {
      const saved = await api.saveAssignedAnswers(
        assignmentId,
        {
          revision: attempt?.revision ?? 0,
          itemId,
          answers: submittedAnswers(item.exercise, snapshot),
        },
        signal,
      );
      if (!signal.aborted) {
        setAttempt(saved);
        setBaseline((previous) => ({ ...previous, [itemId]: snapshot }));
        setNotice(`Problem ${item.position} saved.`);
      }
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not save answers.');
    } finally {
      if (!signal.aborted) setAction(null);
    }
  }
  async function submit() {
    if (!assignment || action || dirty.length || attempt?.submittedAt) return;
    const signal = writes.startRequest();
    setAction('submit');
    setError(null);
    setNotice(null);
    try {
      const saved = await api.submitAssignedWork(assignmentId, attempt?.revision ?? 0, signal);
      if (!signal.aborted) {
        setAttempt(saved);
        const official = savedAnswerMaps(assignment, saved);
        setAnswers(official);
        setBaseline(official);
        setNotice('Final submission recorded.');
      }
    } catch (caught) {
      if (!signal.aborted)
        setError(
          `${caught instanceof Error ? caught.message : 'Submission could not be confirmed.'} Reload saved work to check whether it was recorded before trying again.`,
        );
    } finally {
      if (!signal.aborted) setAction(null);
    }
  }
  async function toggleSolution(itemId: string) {
    if (!assignment?.allowSolutions || !attempt?.submittedAt || action) return;
    if (solutions[itemId]) {
      setSolutions((previous) => {
        const next = { ...previous };
        delete next[itemId];
        return next;
      });
      return;
    }
    const signal = writes.startRequest();
    setAction('solution');
    setError(null);
    try {
      const solution = await api.readAssignedSolution(assignmentId, itemId, signal);
      if (!signal.aborted) setSolutions((previous) => ({ ...previous, [itemId]: solution }));
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not load the solution.');
    } finally {
      if (!signal.aborted) setAction(null);
    }
  }
  return {
    assignment,
    attempt,
    answers,
    solutions,
    loading,
    action,
    error,
    notice,
    dirty,
    load,
    changeAnswer,
    save,
    submit,
    toggleSolution,
  };
}
