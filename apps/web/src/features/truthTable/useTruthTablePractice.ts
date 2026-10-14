import { useEffect, useRef, useState } from 'react';
import type { TruthTableExerciseResponse, TruthTableCheckResponse, TruthTableSolutionResponse } from '@logiclab/contracts';
import { createExercise, checkAnswers, getSolution, PracticeApiError } from '../../api/truth-tables/api';
import { cellKey } from './types';
import type { Answers } from './types';

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
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  function changeFormula(value: string) {
    requestRef.current?.abort();
    setFeedback(null); setSolution(null); setAction(null); setActionError(null);
    setFormula(value); setExercise(null); setAnswers({}); setError(null); setLoading(false);
  }

  async function createTable() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setFeedback(null); setSolution(null); setAction(null); setActionError(null);
    setLoading(true); setError(null); setExercise(null); setAnswers({});
    try {
      const result = await createExercise(formula, controller.signal);
      if (!controller.signal.aborted) setExercise(result);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof PracticeApiError ? caught.message : 'Unable to reach the practice API. Check your connection and try again.');
      inputRef.current?.focus();
      if (caught instanceof PracticeApiError && caught.position !== undefined) {
        inputRef.current?.setSelectionRange(caught.position, caught.position + 1);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const total = exercise ? exercise.rows.length * exercise.columns.filter(column => column.kind === 'answer').length : 0;
  const completed = Object.values(answers).filter(value => value != null).length;
  function changeAnswer(rowId: string, columnId: string, value: boolean | null) {
    requestRef.current?.abort();
    setAction(null); setActionError(null); setFeedback(null);
    setAnswers(previous => ({ ...previous, [cellKey(rowId, columnId)]: value }));
  }

  async function runAction(kind: 'check' | 'solution') {
    if (!exercise) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setAction(kind); setActionError(null);
    if (kind === 'check') setFeedback(null);
    try {
      if (kind === 'check') {
        const submitted = exercise.rows.flatMap(row => exercise.columns.filter(column => column.kind === 'answer')
          .map(column => ({ rowId: row.id, columnId: column.id, value: answers[cellKey(row.id, column.id)] ?? null })));
        const result = await checkAnswers({ formula, answers: submitted }, controller.signal);
        if (!controller.signal.aborted) setFeedback(result);
      } else {
        const result = await getSolution(formula, controller.signal);
        if (!controller.signal.aborted) setSolution(result);
      }
    } catch (caught) {
      if (!controller.signal.aborted) setActionError(caught instanceof PracticeApiError ? caught.message : 'Unable to reach the practice API. Please try again.');
    } finally {
      if (!controller.signal.aborted) setAction(null);
    }
  }

  function toggleSolution() {
    if (solution) setSolution(null);
    else void runAction('solution');
  }

  return { feedback, solution, action, actionError, check: () => runAction('check'), toggleSolution, formula, exercise, answers, loading, error, inputRef, total, completed, changeFormula, createTable, changeAnswer };
}
