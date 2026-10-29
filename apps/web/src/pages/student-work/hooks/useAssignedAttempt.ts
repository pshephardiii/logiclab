import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  StudentAssignment,
  StudentAttempt,
  StudentSolutionResponse,
  StudentCheckResponse,
  ConceptualAnswer,
  AssignmentResponseValue,
} from '@logiclab/contracts';
import { cellKey } from '../../../features/truthTable/types';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';
import { useAssignedAnswers } from './useAssignedAnswers';
import * as apiModule from '../../../api/student-work/api';

// At most 50 automatic requests/minute during continuous edits; leave headroom for other work.
export const IMMEDIATE_CHECK_DELAY_MS = 1200;

/** Keeps unsaved edits separate from revisions; transient checks are canceled on edits and lifecycle changes. */
export function useAssignedAttempt(assignmentId: string) {
  const api = useResourceApi(apiModule);
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const {
    answers,
    choiceAnswers,
    dirty,
    completionReady,
    resetAnswers,
    changeTableAnswers,
    changeChoiceAnswers,
    markSaved,
    responseFor,
  } = useAssignedAnswers(assignment);
  const [solutions, setSolutions] = useState<Record<string, StudentSolutionResponse['solution']>>(
    {},
  );
  const [feedback, setFeedback] = useState<Record<string, StudentCheckResponse['feedback']>>({});
  const [checkingItem, setCheckingItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'save' | 'submit' | 'solution' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checks = useAbortableRequest();
  const reads = useAbortableRequest();
  const writes = useAbortableRequest();
  const hasFinalSubmission =
    assignment !== null && assignment.assessmentMode !== 'ungraded_practice';
  const requiresCompleteAnswers = assignment?.assessmentMode === 'completion_only';
  const allowsImmediateFeedback = assignment?.feedbackTiming === 'immediate';
  const allowsExplicitCheck = assignment?.feedbackTiming === 'on_check' || allowsImmediateFeedback;
  const solutionAvailable =
    assignment?.solutionAccess === 'anytime' ||
    (assignment?.solutionAccess === 'instructor_release' &&
      Boolean(assignment.answersRevealedAt)) ||
    (assignment?.solutionAccess === 'after_submission' && Boolean(attempt?.submittedAt));

  const cancelCheck = useCallback(() => {
    if (checkTimer.current !== null) clearTimeout(checkTimer.current);
    checkTimer.current = null;
    checks.cancelRequest();
    setCheckingItem(null);
  }, [checks.cancelRequest]);
  const load = useCallback(async () => {
    const signal = reads.startRequest();
    writes.cancelRequest();
    cancelCheck();
    setFeedback({});
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
        resetAnswers(result.assignment, result.attempt);
      }
    } catch (caught) {
      if (!signal.aborted) {
        setAssignment(null);
        setError(caught instanceof Error ? caught.message : 'Could not load work.');
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [api, assignmentId, reads.startRequest, writes.cancelRequest, cancelCheck, resetAnswers]);
  useEffect(() => {
    void load();
    return () => {
      reads.cancelRequest();
      cancelCheck();
    };
  }, [load, reads.cancelRequest, cancelCheck]);
  function changeAnswer(itemId: string, row: string, column: string, value: boolean | null) {
    if (loading || action || attempt?.submittedAt) return;
    cancelCheck();
    setFeedback((previous) => {
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
    setError(null);
    setNotice(null);
    const item = assignment?.items.find((value) => value.id === itemId);
    if (!item || !('exercise' in item)) return;
    const snapshot = { ...answers[itemId], [cellKey(row, column)]: value };
    changeTableAnswers(itemId, snapshot);
    if (allowsImmediateFeedback) {
      // Capture the edited answers rather than the render preceding this state update.
      checkTimer.current = setTimeout(() => {
        checkTimer.current = null;
        void check(itemId, responseFor(item, snapshot));
      }, IMMEDIATE_CHECK_DELAY_MS);
    }
  }
  function changeConceptualAnswer(itemId: string, snapshot: ConceptualAnswer) {
    if (loading || action || attempt?.submittedAt) return;
    const item = assignment?.items.find((value) => value.id === itemId);
    if (!item || !('content' in item) || item.content.type !== snapshot.type) return;
    cancelCheck();
    setFeedback((previous) => {
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
    setError(null);
    setNotice(null);
    changeChoiceAnswers(itemId, snapshot);
    if (allowsImmediateFeedback)
      checkTimer.current = setTimeout(() => {
        checkTimer.current = null;
        void check(itemId, snapshot);
      }, IMMEDIATE_CHECK_DELAY_MS);
  }
  async function save(itemId: string) {
    if (!assignment || action || attempt?.submittedAt) return;
    const item = assignment.items.find((value) => value.id === itemId);
    if (!item) return;
    cancelCheck();
    const snapshot = answers[itemId] ?? {};
    const response = responseFor(item, snapshot);
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
          answers: response,
        },
        signal,
      );
      if (!signal.aborted) {
        setAttempt(saved);
        markSaved(itemId, snapshot, response);
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
    if (
      !assignment ||
      !hasFinalSubmission ||
      action ||
      dirty.length ||
      attempt?.submittedAt ||
      (requiresCompleteAnswers && !completionReady)
    )
      return;
    cancelCheck();
    const signal = writes.startRequest();
    setAction('submit');
    setError(null);
    setNotice(null);
    try {
      const saved = await api.submitAssignedWork(assignmentId, attempt?.revision ?? 0, signal);
      if (!signal.aborted) {
        setAttempt(saved);
        resetAnswers(assignment, saved);
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
  async function check(itemId: string, snapshot?: AssignmentResponseValue) {
    if (!assignment || loading || !allowsExplicitCheck || action || attempt?.submittedAt) return;
    const item = assignment.items.find((value) => value.id === itemId);
    if (!item) return;
    cancelCheck();
    const signal = checks.startRequest();
    setCheckingItem(itemId);
    setError(null);
    setNotice(null);
    try {
      const response = await api.checkAssignedAnswers(
        assignmentId,
        {
          itemId,
          answers: snapshot ?? responseFor(item),
        },
        signal,
      );
      const feedback = response.feedback;
      if (!signal.aborted) setFeedback((previous) => ({ ...previous, [itemId]: feedback }));
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not check answers.');
    } finally {
      if (!signal.aborted) setCheckingItem(null);
    }
  }
  async function toggleSolution(itemId: string) {
    if (!solutionAvailable || action) return;
    cancelCheck();
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
    feedback,
    checkingItem,
    check,
    hasFinalSubmission,
    requiresCompleteAnswers,
    completionReady,
    allowsExplicitCheck,
    allowsImmediateFeedback,
    cancelCheck,
    solutionAvailable,
    answers,
    choiceAnswers,
    solutions,
    loading,
    action,
    error,
    notice,
    dirty,
    load,
    changeAnswer,
    changeConceptualAnswer,
    save,
    submit,
    toggleSolution,
  };
}
