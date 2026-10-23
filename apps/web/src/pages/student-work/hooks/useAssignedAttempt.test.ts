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
