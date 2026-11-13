import { assignedWorkCapabilities } from '../helpers/assigned-work-state';
import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConceptualAnswer, ProofCheckReport } from '@logiclab/contracts';
import type { SavedDerivationAnswer as DerivationAnswer } from '@logiclab/contracts/saved-student-work';
import {
  savedStudentAnswersSchema,
  savedStudentCheckSchema,
  type SavedStudentAssignment as StudentAssignment,
  type SavedStudentAttempt as StudentAttempt,
  type SavedStudentSolutionResponse as StudentSolutionResponse,
  type SavedStudentCheckResponse as StudentCheckResponse,
  type SavedStudentResponseValue as AssignmentResponseValue,
} from '@logiclab/contracts/saved-student-work';
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
    proofAnswers,
    dirty,
    completionReady,
    resetAnswers,
    changeTableAnswers,
    changeChoiceAnswers,
    changeProofAnswers,
    markSaved,
    responseFor,
  } = useAssignedAnswers(assignment);

  const [solutions, setSolutions] = useState<Record<string, StudentSolutionResponse['solution']>>(
    {},
  );

  const [feedback, setFeedback] = useState<Record<string, StudentCheckResponse['feedback']>>({});

  const [proofFeedback, setProofFeedback] = useState<
    Record<string, { proof: DerivationAnswer['proof']; report: ProofCheckReport }>
  >({});

  const [checkingItem, setCheckingItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'save' | 'submit' | 'solution' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checks = useAbortableRequest();
  const reads = useAbortableRequest();
  const writes = useAbortableRequest();

  const {
    workUnavailable,
    hasFinalSubmission,
    requiresCompleteAnswers,
    allowsImmediateFeedback,
    allowsExplicitCheck,
    solutionAvailable,
  } = assignedWorkCapabilities(assignment, attempt);

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
    setProofFeedback({});
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
    if (workUnavailable || loading || action || attempt?.submittedAt) return;

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
    if (workUnavailable || loading || action || attempt?.submittedAt) return;

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

  function changeProofAnswer(itemId: string, snapshot: DerivationAnswer) {
    if (workUnavailable || loading || action || attempt?.submittedAt) return;

    const item = assignment?.items.find((value) => value.id === itemId);

    if (
      !item ||
      !('content' in item) ||
      item.content.type !== 'derivation' ||
      item.content.format !== snapshot.proof.format
    )
      return;

    cancelCheck();

    setFeedback((previous) => {
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
    setProofFeedback((previous) => {
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
    setError(null);
    setNotice(null);

    changeProofAnswers(itemId, snapshot);
    // Proof diagnostics are always explicit, including mixed immediate-feedback assignments.
  }

  async function save(itemId: string) {
    if (workUnavailable || !assignment || action || attempt?.submittedAt) return;

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
        savedStudentAnswersSchema.parse({
          revision: attempt?.revision ?? 0,
          itemId,
          answers: response,
        }),
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
      workUnavailable ||
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
      const checkedAnswer = snapshot ?? responseFor(item);

      const response = await api.checkAssignedAnswers(
        assignmentId,
        savedStudentCheckSchema.parse({ itemId, answers: checkedAnswer }),
        signal,
      );

      if (response.itemId !== itemId)
        throw new Error('The check response did not match this problem.');

      const feedback = response.feedback;

      if (!signal.aborted) {
        setFeedback((previous) => ({ ...previous, [itemId]: feedback }));

        if (
          'type' in feedback &&
          feedback.type === 'derivation' &&
          !Array.isArray(checkedAnswer) &&
          checkedAnswer.type === 'derivation'
        )
          setProofFeedback((previous) => ({
            ...previous,
            [itemId]: { proof: checkedAnswer.proof, report: feedback.report },
          }));
      }
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
    workUnavailable,
    feedback,
    proofFeedback,
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
    proofAnswers,
    solutions,
    loading,
    action,
    error,
    notice,
    dirty,
    load,
    changeAnswer,
    changeConceptualAnswer,
    changeProofAnswer,
    save,
    submit,
    toggleSolution,
  };
}
