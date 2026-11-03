import { act, renderHook } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { TruthTableExerciseResponse, TruthTableCheckResponse } from '@logiclab/contracts';
import { createExercise, checkAnswers } from '../../../api/truth-tables/api';
import { useTruthTablePractice } from './useTruthTablePractice';

vi.mock('../../../api/truth-tables/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../api/truth-tables/api')>();
  return { ...original, createExercise: vi.fn(), checkAnswers: vi.fn() };
});
const exercise: TruthTableExerciseResponse = {
  variables: ['P'],
  columns: [
    { id: 'var:v1:P', label: 'P', kind: 'given', isFinal: false },
    { id: 'expr:v1:P', label: 'P', kind: 'answer', isFinal: true },
  ],
  rows: [{ id: 'row:v1:P=T', values: { 'var:v1:P': true } }],
};

test('answer edits abort a pending check and ignore its late result', async () => {
  vi.mocked(createExercise).mockResolvedValue(exercise);
  let resolve!: (response: TruthTableCheckResponse) => void;
  vi.mocked(checkAnswers).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const hook = renderHook(() => useTruthTablePractice());
  await act(async () => {
    await hook.result.current.createTable();
  });
  act(() => hook.result.current.changeAnswer('row:v1:P=T', 'expr:v1:P', true));
  let pending!: Promise<void>;
  act(() => {
    pending = hook.result.current.check();
  });
  const signal = vi.mocked(checkAnswers).mock.calls[0]![1];
  act(() => hook.result.current.changeAnswer('row:v1:P=T', 'expr:v1:P', false));
  expect(signal.aborted).toBe(true);
  await act(async () => {
    resolve({ cells: [], summary: { correct: 1, incorrect: 0, unanswered: 0, total: 1 } });
    await pending;
  });
  expect(hook.result.current.feedback).toBeNull();
  expect(hook.result.current.action).toBeNull();
  expect(hook.result.current.completed).toBe(1);
});

test('preview formulas and answers stay independent of the practice session', async () => {
  vi.mocked(createExercise).mockResolvedValue(exercise);
  const practice = renderHook(() => useTruthTablePractice());
  const preview = renderHook(() => useTruthTablePractice('P'));
  expect(preview.result.current.formula).toBe('P');
  expect(practice.result.current.formula).toBe('(P ∧ Q) → R');
  await act(async () => {
    await preview.result.current.createTable();
  });
  act(() => preview.result.current.changeAnswer('row:v1:P=T', 'expr:v1:P', true));
  expect(preview.result.current.completed).toBe(1);
  expect(practice.result.current.exercise).toBeNull();
  expect(practice.result.current.answers).toEqual({});
});

test.each(['resolve', 'reject'] as const)(
  'formula replacement aborts table creation and ignores its late %s',
  async (outcome) => {
    let resolve!: (value: TruthTableExerciseResponse) => void;
    let reject!: (error: Error) => void;
    vi.mocked(createExercise).mockImplementationOnce(
      () =>
        new Promise((done, fail) => {
          resolve = done;
          reject = fail;
        }),
    );
    const { result } = renderHook(() => useTruthTablePractice());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.createTable();
    });
    const signal = vi.mocked(createExercise).mock.calls.at(-1)![1];
    expect(result.current.loading).toBe(true);
    act(() => result.current.changeFormula('Q'));
    expect(signal.aborted).toBe(true);
    await act(async () => {
      if (outcome === 'resolve') resolve(exercise);
      else reject(new Error('Obsolete request failed'));
      await pending;
    });
    expect(result.current.formula).toBe('Q');
    expect(result.current.exercise).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.answers).toEqual({});
    vi.mocked(createExercise).mockResolvedValueOnce(exercise);
    await act(async () => {
      await result.current.createTable();
    });
    expect(createExercise).toHaveBeenLastCalledWith('Q', expect.any(AbortSignal));
    expect(result.current.exercise).toEqual(exercise);
  },
);
