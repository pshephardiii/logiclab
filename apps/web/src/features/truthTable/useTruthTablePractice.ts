import { useEffect, useRef, useState } from 'react';
import type { TruthTableExerciseResponse } from '@logiclab/schema';
import { createExercise, PracticeApiError } from './api';
import { cellKey } from './types';
import type { Answers } from './types';

export function useTruthTablePractice() {
  const [formula, setFormula] = useState('(P ∧ Q) → R');
  const [exercise, setExercise] = useState<TruthTableExerciseResponse | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  function changeFormula(value: string) {
    requestRef.current?.abort();
    setFormula(value); setExercise(null); setAnswers({}); setError(null); setLoading(false);
  }

  async function createTable() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
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
    setAnswers(previous => ({ ...previous, [cellKey(rowId, columnId)]: value }));
  }

  return { formula, exercise, answers, loading, error, inputRef, total, completed, changeFormula, createTable, changeAnswer };
}
