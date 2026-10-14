import { useAbortableRequest } from '../../../hooks/useAbortableRequest';
import { submittedAnswers } from '../helpers/submitted-answers';
import { useRef, useState } from 'react';
import type { TruthTableExerciseResponse, TruthTableCheckResponse, TruthTableSolutionResponse } from '@logiclab/contracts';
import { createExercise, checkAnswers, getSolution, PracticeApiError } from '../../../api/truth-tables/api';
import { cellKey } from '../types';
import type { Answers } from '../types';

/**
 * Owns the current formula, exercise, answers, checking feedback, and solution visibility.
 * Edits cancel pending work so superseded responses cannot restore stale exercise state.
 */
export function useTruthTablePractice() {
  const [formula, setFormula] = useState('(P ∧ Q) → R');
  const [exercise, setExercise] = useState<TruthTableExerciseResponse | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<TruthTableCheckResponse | null>(null);
  const [solution, setSolution] = useState<TruthTableSolutionResponse | null>(null);
  const [action, setAction] = useState<'check' | 'solution' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { startRequest, cancelRequest } = useAbortableRequest();

  function resetFeedback() {
    setFeedback(null);
    setSolution(null);
    setAction(null);
    setActionError(null);
  }

  function changeFormula(value: string) {
    cancelRequest();
    resetFeedback();
    setFormula(value);
    setExercise(null);
    setAnswers({});
    setError(null);
    setLoading(false);
  }

  async function createTable() {
    const signal = startRequest();
    resetFeedback();
    setLoading(true);
    setError(null);
    setExercise(null);
    setAnswers({});
    try {
      const result = await createExercise(formula, signal);
      if (!signal.aborted) setExercise(result);
    } catch (caught) {
      if (signal.aborted) return;
      setError(caught instanceof PracticeApiError ? caught.message : 'Unable to reach the practice API. Check your connection and try again.');
      inputRef.current?.focus();
      if (caught instanceof PracticeApiError && caught.position !== undefined) {
        inputRef.current?.setSelectionRange(caught.position, caught.position + 1);
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }

  const total = exercise ? exercise.rows.length * exercise.columns.filter(column => column.kind === 'answer').length : 0;
  const completed = Object.values(answers).filter(value => value != null).length;
  function changeAnswer(rowId: string, columnId: string, value: boolean | null) {
    cancelRequest();
    setAction(null);
    setActionError(null);
    setFeedback(null);
    setAnswers(previous => ({ ...previous, [cellKey(rowId, columnId)]: value }));
  }

  async function runAction(kind: 'check' | 'solution') {
    if (!exercise) return;
    const signal = startRequest();
    setAction(kind);
    setActionError(null);
    if (kind === 'check') setFeedback(null);
    try {
      if (kind === 'check') {
        const result = await checkAnswers({ formula, answers: submittedAnswers(exercise, answers) }, signal);
        if (!signal.aborted) setFeedback(result);
      } else {
        const result = await getSolution(formula, signal);
        if (!signal.aborted) setSolution(result);
      }
    } catch (caught) {
      if (!signal.aborted) setActionError(caught instanceof PracticeApiError ? caught.message : 'Unable to reach the practice API. Please try again.');
    } finally {
      if (!signal.aborted) setAction(null);
    }
  }

  function toggleSolution() {
    if (solution) setSolution(null);
    else void runAction('solution');
  }

  function check() {
    return runAction('check');
  }

  return {
    feedback, solution, action, actionError, check, toggleSolution,
    formula, exercise, answers, loading, error, inputRef, total, completed,
    changeFormula, createTable, changeAnswer,
  };
}
