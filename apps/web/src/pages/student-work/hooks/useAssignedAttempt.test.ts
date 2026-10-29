import {
  conceptualWork,
  conceptualSaved,
  optionA,
  optionB,
} from '../../../../test/conceptual-work-fixture';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as api from '../../../api/student-work/api';
import {
  work,
  saved,
  itemA,
  itemB,
  submitted,
  solution,
} from '../../../../test/assignment-work-fixture';
import { cellKey } from '../../../features/truthTable/types';
import { submissionFeedback } from '../../../features/assignment/helpers/submission-feedback';
import { IMMEDIATE_CHECK_DELAY_MS, useAssignedAttempt } from './useAssignedAttempt';

vi.mock('../../../api/student-work/api', () => ({
  readAssignedWork: vi.fn(),
  saveAssignedAnswers: vi.fn(),
  submitAssignedWork: vi.fn(),
  checkAssignedAnswers: vi.fn(),
  readAssignedSolution: vi.fn(),
}));
const response = { itemId: itemA, feedback: submissionFeedback(submitted.result, itemA)! };

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: {
      ...work,
      assessmentMode: 'ungraded_practice',
      feedbackTiming: 'immediate',
      solutionAccess: 'anytime',
    },
    attempt: null,
  });
  vi.mocked(api.checkAssignedAnswers).mockResolvedValue(response);
  vi.mocked(api.saveAssignedAnswers).mockResolvedValue(saved);
  vi.mocked(api.readAssignedSolution).mockResolvedValue(solution);
});
afterEach(() => vi.useRealTimers());

async function open() {
  const view = renderHook(({ id }) => useAssignedAttempt(id), { initialProps: { id: work.id } });
  await act(async () => {});
  return view;
}
async function tick() {
  await act(async () => vi.advanceTimersByTimeAsync(IMMEDIATE_CHECK_DELAY_MS));
}

test('debounces rapid changes with latest false/blank values and never saves or submits', async () => {
  const { result } = await open();
  act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', true));
  await act(async () => vi.advanceTimersByTimeAsync(IMMEDIATE_CHECK_DELAY_MS - 1));
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
  act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
  act(() => result.current.changeAnswer(itemA, 'r2', 'expr:v1:P', null));
  await tick();
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
  expect(api.checkAssignedAnswers).toHaveBeenCalledWith(
    work.id,
    { itemId: itemA, answers: saved.answers[itemA] },
    expect.any(AbortSignal),
  );
  expect(result.current.feedback[itemA]).toEqual(response.feedback);
  expect(result.current.dirty).toEqual([itemA]);
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  expect(api.submitAssignedWork).not.toHaveBeenCalled();
});

test('edits abort an in-flight check and late feedback cannot replace newer feedback', async () => {
  let resolve!: (value: typeof response) => void;
  vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result } = await open();
  act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
  await tick();
  const signal = vi.mocked(api.checkAssignedAnswers).mock.calls[0]![2];
  act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', true));
  expect(signal.aborted).toBe(true);
  expect(result.current.feedback[itemA]).toBeUndefined();
  const newer = {
    ...response,
    feedback: {
      ...response.feedback,
      cells: [],
      summary: { correct: 1, incorrect: 0, unanswered: 1, total: 2 },
    },
  };
  vi.mocked(api.checkAssignedAnswers).mockResolvedValueOnce(newer);
  await tick();
  await act(async () => resolve(response));
  expect(result.current.feedback[itemA]).toEqual(newer.feedback);
});

test('manual checking cancels the debounce instead of sending a duplicate check', async () => {
  const { result } = await open();
  act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
  await act(async () => result.current.check(itemA));
  await tick();
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
});

test.each(['cancel', 'save', 'reload', 'solution', 'assignment', 'unmount'] as const)(
  '%s cancels a queued automatic check',
  async (operation) => {
    const { result, rerender, unmount } = await open();
    act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
    if (operation === 'cancel') act(() => result.current.cancelCheck());
    if (operation === 'save') await act(async () => result.current.save(itemA));
    if (operation === 'reload') await act(async () => result.current.load());
    if (operation === 'solution') await act(async () => result.current.toggleSolution(itemA));
    if (operation === 'assignment') await act(async () => rerender({ id: itemB }));
    if (operation === 'unmount') unmount();
    await tick();
    expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
  },
);

test('automatic failures retain edits, do not retry in a loop, and allow manual retry', async () => {
  vi.mocked(api.checkAssignedAnswers).mockRejectedValueOnce(new Error('Too many requests'));
  const { result } = await open();
  act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
  await tick();
  expect(result.current.error).toBe('Too many requests');
  expect(result.current.answers[itemA]).toEqual({
    [cellKey('r1', 'expr:v1:P')]: false,
    [cellKey('r2', 'expr:v1:P')]: null,
  });
  await tick();
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
  await act(async () => result.current.check(itemA));
  expect(result.current.error).toBeNull();
  expect(result.current.feedback[itemA]).toEqual(response.feedback);
});

test.each(['on_submission', 'on_check'] as const)(
  '%s work never checks automatically',
  async (feedbackTiming) => {
    vi.mocked(api.readAssignedWork).mockResolvedValue({
      assignment: {
        ...work,
        feedbackTiming,
        assessmentMode: feedbackTiming === 'on_check' ? 'ungraded_practice' : 'graded',
      },
      attempt: null,
    });
    const { result } = await open();
    act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
    await tick();
    expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
  },
);

test.each(['cancel', 'reload', 'assignment', 'unmount'] as const)(
  '%s aborts in-flight feedback and ignores its late result',
  async (operation) => {
    let resolve!: (value: typeof response) => void;
    vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { result, rerender, unmount } = await open();
    act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
    await tick();
    const signal = vi.mocked(api.checkAssignedAnswers).mock.calls[0]![2];
    if (operation === 'cancel') act(() => result.current.cancelCheck());
    if (operation === 'reload') await act(async () => result.current.load());
    if (operation === 'assignment') await act(async () => rerender({ id: itemB }));
    if (operation === 'unmount') unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(response));
    expect(result.current.feedback[itemA]).toBeUndefined();
  },
);

test('submitted completion work cannot schedule or manually request feedback', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...work, assessmentMode: 'completion_only', feedbackTiming: 'immediate' },
    attempt: submitted,
  });
  const { result } = await open();
  act(() => result.current.changeAnswer(itemA, 'r1', 'expr:v1:P', false));
  await act(async () => result.current.check(itemA));
  await tick();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
});

test('conceptual loads preserve saved false and independent unanswered choices', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: conceptualWork,
    attempt: conceptualSaved,
  });
  const { result } = await open();
  expect(result.current.error).toBeNull();
  expect(result.current.choiceAnswers[itemA]).toEqual({ type: 'true_false', answer: false });
  expect(result.current.choiceAnswers[itemB]).toEqual({ type: 'multiple_choice', optionId: null });
  expect(result.current.dirty).toEqual([]);
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
});

async function openChoices(overrides: Partial<typeof conceptualWork> = {}) {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...conceptualWork, ...overrides },
    attempt: conceptualSaved,
  });
  return open();
}

test('choice saves are explicit, retain failed edits and update only the saved baseline', async () => {
  const { result } = await openChoices();
  act(() => result.current.changeConceptualAnswer(itemA, { type: 'true_false', answer: true }));
  act(() =>
    result.current.changeConceptualAnswer(itemB, { type: 'multiple_choice', optionId: optionA }),
  );
  expect(result.current.dirty).toEqual([itemA, itemB]);
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  vi.mocked(api.saveAssignedAnswers).mockRejectedValueOnce(new Error('Revision conflict'));
  await act(async () => result.current.save(itemA));
  expect(result.current.choiceAnswers[itemA]).toEqual({ type: 'true_false', answer: true });
  expect(result.current.dirty).toEqual([itemA, itemB]);
  vi.mocked(api.saveAssignedAnswers).mockResolvedValueOnce({
    ...conceptualSaved,
    revision: 2,
    answers: { ...conceptualSaved.answers, [itemA]: { type: 'true_false', answer: true } },
  });
  await act(async () => result.current.save(itemA));
  expect(api.saveAssignedAnswers).toHaveBeenLastCalledWith(
    work.id,
    { revision: 1, itemId: itemA, answers: { type: 'true_false', answer: true } },
    expect.any(AbortSignal),
  );
  expect(result.current.dirty).toEqual([itemB]);
  act(() =>
    result.current.changeConceptualAnswer(itemB, { type: 'multiple_choice', optionId: null }),
  );
  expect(result.current.dirty).toEqual([]);
});

test('immediate choice checks debounce latest snapshots, never save, and ignore late results', async () => {
  const { result } = await openChoices({ feedbackTiming: 'immediate' });
  let resolve!: (value: { itemId: string; feedback: { status: 'incorrect' } }) => void;
  vi.mocked(api.checkAssignedAnswers).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  act(() =>
    result.current.changeConceptualAnswer(itemB, { type: 'multiple_choice', optionId: optionA }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(IMMEDIATE_CHECK_DELAY_MS - 1));
  act(() =>
    result.current.changeConceptualAnswer(itemB, { type: 'multiple_choice', optionId: optionB }),
  );
  await tick();
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
  expect(api.checkAssignedAnswers).toHaveBeenLastCalledWith(
    work.id,
    { itemId: itemB, answers: { type: 'multiple_choice', optionId: optionB } },
    expect.any(AbortSignal),
  );
  act(() =>
    result.current.changeConceptualAnswer(itemB, { type: 'multiple_choice', optionId: null }),
  );
  await act(async () => resolve({ itemId: itemB, feedback: { status: 'incorrect' } }));
  expect(result.current.feedback[itemB]).toBeUndefined();
  act(() => result.current.cancelCheck());
  await tick();
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
});

test('manual choice checking bypasses the timer and retains input after failure without retries', async () => {
  const { result } = await openChoices({ feedbackTiming: 'immediate' });
  act(() => result.current.changeConceptualAnswer(itemA, { type: 'true_false', answer: true }));
  vi.mocked(api.checkAssignedAnswers).mockRejectedValueOnce(new Error('Try again'));
  await act(async () => result.current.check(itemA));
  await tick();
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
  expect(result.current.choiceAnswers[itemA]).toEqual({ type: 'true_false', answer: true });
  expect(result.current.error).toBe('Try again');
  vi.mocked(api.checkAssignedAnswers).mockResolvedValueOnce({
    itemId: itemA,
    feedback: { status: 'incorrect' },
  });
  await act(async () => result.current.check(itemA));
  expect(result.current.feedback[itemA]).toEqual({ status: 'incorrect' });
});

test('completion requires every occurrence answered and saved, with false counted as filled', async () => {
  const { result } = await openChoices({
    assessmentMode: 'completion_only',
    feedbackTiming: 'on_submission',
  });
  expect(result.current.completionReady).toBe(false);
  act(() =>
    result.current.changeConceptualAnswer(itemB, { type: 'multiple_choice', optionId: optionA }),
  );
  expect(result.current.completionReady).toBe(true);
  await act(async () => result.current.submit());
  expect(api.submitAssignedWork).not.toHaveBeenCalled();
  const filled = {
    ...conceptualSaved,
    answers: {
      ...conceptualSaved.answers,
      [itemB]: { type: 'multiple_choice' as const, optionId: optionA },
    },
  };
  vi.mocked(api.saveAssignedAnswers).mockResolvedValueOnce({ ...filled, revision: 2 });
  await act(async () => result.current.save(itemB));
  vi.mocked(api.submitAssignedWork).mockResolvedValueOnce({
    ...filled,
    revision: 3,
    submittedAt: submitted.submittedAt,
    result: {
      gradingVersion: 'mixed_completion_v1',
      items: [
        { itemId: itemA, type: 'true_false', completedResponses: 1, totalResponses: 1 },
        { itemId: itemB, type: 'multiple_choice', completedResponses: 1, totalResponses: 1 },
      ],
      summary: { completedResponses: 2, totalResponses: 2 },
    },
  });
  await act(async () => result.current.submit());
  expect(api.submitAssignedWork).toHaveBeenCalledWith(work.id, 2, expect.any(AbortSignal));
  expect(result.current.dirty).toEqual([]);
  expect(result.current.completionReady).toBe(true);
});

test('conceptual solutions obey policy, toggle independently and never replace entries', async () => {
  const { result } = await openChoices();
  vi.mocked(api.readAssignedSolution).mockResolvedValueOnce({
    type: 'true_false',
    correctAnswer: true,
    explanation: 'Released explanation.',
  });
  await act(async () => result.current.toggleSolution(itemA));
  expect(result.current.solutions[itemA]).toEqual({
    type: 'true_false',
    correctAnswer: true,
    explanation: 'Released explanation.',
  });
  expect(result.current.choiceAnswers[itemA]).toEqual({ type: 'true_false', answer: false });
  await act(async () => result.current.toggleSolution(itemA));
  expect(result.current.solutions[itemA]).toBeUndefined();
  expect(api.readAssignedSolution).toHaveBeenCalledTimes(1);
});

test('mixed table and choice edits retain independent baselines and completion counts', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: {
      ...conceptualWork,
      assessmentMode: 'completion_only',
      items: [conceptualWork.items[0]!, work.items[1]!],
    },
    attempt: { ...conceptualSaved, answers: { [itemA]: { type: 'true_false', answer: false } } },
  });
  const { result } = await open();
  expect(result.current.completionReady).toBe(false);
  act(() => result.current.changeAnswer(itemB, 'r1', 'expr:v1:P', false));
  act(() => result.current.changeAnswer(itemB, 'r2', 'expr:v1:P', false));
  expect(result.current.completionReady).toBe(true);
  act(() => result.current.changeConceptualAnswer(itemA, { type: 'true_false', answer: null }));
  expect(result.current.completionReady).toBe(false);
  expect(result.current.dirty).toEqual([itemB, itemA]);
  act(() => result.current.changeConceptualAnswer(itemA, { type: 'true_false', answer: false }));
  expect(result.current.dirty).toEqual([itemB]);
  await act(async () => result.current.save(itemB));
  expect(api.saveAssignedAnswers).toHaveBeenLastCalledWith(
    work.id,
    {
      revision: 1,
      itemId: itemB,
      answers: [
        { rowId: 'r1', columnId: 'expr:v1:P', value: false },
        { rowId: 'r2', columnId: 'expr:v1:P', value: false },
      ],
    },
    expect.any(AbortSignal),
  );
  expect(result.current.choiceAnswers[itemA]).toEqual({ type: 'true_false', answer: false });
  expect(result.current.dirty).toEqual([]);
});
