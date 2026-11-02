import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as api from '../../../api/student-work/api';
import {
  proofWork,
  proofSaved,
  proofAnswer,
  editedProof,
  checkedProof,
  itemA,
  itemB,
  tableId,
} from '../../../../test/proof-work-fixture';
import { useAssignedAttempt, IMMEDIATE_CHECK_DELAY_MS } from './useAssignedAttempt';
vi.mock('../../../api/student-work/api', () => ({
  readAssignedWork: vi.fn(),
  saveAssignedAnswers: vi.fn(),
  submitAssignedWork: vi.fn(),
  checkAssignedAnswers: vi.fn(),
  readAssignedSolution: vi.fn(),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: proofWork, attempt: proofSaved });
  vi.mocked(api.checkAssignedAnswers).mockResolvedValue(checkedProof);
});
afterEach(() => vi.useRealTimers());
async function open() {
  const view = renderHook(({ id }) => useAssignedAttempt(id), {
    initialProps: { id: proofWork.id },
  });
  await act(async () => {});
  return view;
}
test('proof baselines load without filling missing occurrences, and exact reversion clears dirty state', async () => {
  const { result } = await open();
  expect(result.current.proofAnswers[itemA]).toEqual(proofAnswer);
  expect(result.current.proofAnswers[itemB]).toBeUndefined();
  expect(result.current.dirty).toEqual([]);
  act(() => result.current.changeProofAnswer(itemA, editedProof('P &')));
  expect(result.current.dirty).toEqual([itemA]);
  act(() => result.current.changeProofAnswer(itemA, structuredClone(proofAnswer)));
  expect(result.current.dirty).toEqual([]);
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
});
test('failed proof saves retain every draft; a successful save advances only its captured occurrence baseline', async () => {
  const { result } = await open();
  const first = editedProof('P &');
  const second = editedProof('R');
  act(() => result.current.changeProofAnswer(itemA, first));
  act(() => result.current.changeProofAnswer(itemB, second));
  vi.mocked(api.saveAssignedAnswers)
    .mockRejectedValueOnce(new Error('Revision conflict'))
    .mockResolvedValueOnce({ ...proofSaved, revision: 2, answers: { [itemA]: first } });
  await act(async () => result.current.save(itemA));
  expect(result.current.error).toContain('Revision conflict');
  expect(result.current.proofAnswers).toEqual({ [itemA]: first, [itemB]: second });
  expect(result.current.dirty).toEqual([itemA, itemB]);
  await act(async () => result.current.save(itemA));
  expect(api.saveAssignedAnswers).toHaveBeenLastCalledWith(
    proofWork.id,
    { revision: 1, itemId: itemA, answers: first },
    expect.any(AbortSignal),
  );
  expect(result.current.dirty).toEqual([itemB]);
  expect(result.current.proofAnswers[itemB]).toEqual(second);
  expect(result.current.attempt!.revision).toBe(2);
});
test('mixed immediate feedback never automatically checks proofs and proof edits cancel queued objective checks', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...proofWork, feedbackTiming: 'immediate' },
    attempt: proofSaved,
  });
  const { result } = await open();
  act(() => result.current.changeAnswer(tableId, 'r1', 'expr:v1:P', true));
  act(() => result.current.changeProofAnswer(itemA, editedProof()));
  await act(async () => vi.advanceTimersByTimeAsync(IMMEDIATE_CHECK_DELAY_MS * 3));
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
  await act(async () => result.current.check(itemA));
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
  expect(api.checkAssignedAnswers).toHaveBeenCalledWith(
    proofWork.id,
    { itemId: itemA, answers: editedProof() },
    expect.any(AbortSignal),
  );
  expect(result.current.proofFeedback[itemA]).toEqual({
    proof: editedProof().proof,
    report: checkedProof.feedback.report,
  });
  expect(result.current.dirty).toContain(itemA);
});
test('a proof edit cancels an in-flight check and late reports cannot replace current work', async () => {
  let resolve!: (value: typeof checkedProof) => void;
  vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result } = await open();
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.check(itemA);
  });
  const signal = vi.mocked(api.checkAssignedAnswers).mock.calls[0]![2];
  act(() => result.current.changeProofAnswer(itemA, editedProof()));
  expect(signal.aborted).toBe(true);
  await act(async () => {
    resolve(checkedProof);
    await pending;
  });
  expect(result.current.proofFeedback[itemA]).toBeUndefined();
  expect(result.current.feedback[itemA]).toBeUndefined();
  expect(result.current.proofAnswers[itemA]).toEqual(editedProof());
});
test.each(['selection', 'save', 'reload', 'assignment', 'unmount'] as const)(
  '%s cancels a proof check and ignores a late response',
  async (operation) => {
    let resolve!: (value: typeof checkedProof) => void;
    vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    vi.mocked(api.saveAssignedAnswers).mockResolvedValue(proofSaved);
    const { result, rerender, unmount } = await open();
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.check(itemA);
    });
    const signal = vi.mocked(api.checkAssignedAnswers).mock.calls[0]![2];
    if (operation === 'selection') act(() => result.current.cancelCheck());
    if (operation === 'save') await act(async () => result.current.save(itemA));
    if (operation === 'reload') await act(async () => result.current.load());
    if (operation === 'assignment') await act(async () => rerender({ id: itemB }));
    if (operation === 'unmount') unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolve(checkedProof);
      await pending;
    });
    expect(result.current.proofFeedback[itemA]).toBeUndefined();
  },
);
test('check failures preserve proof edits and do not enter automatic retry loops', async () => {
  vi.mocked(api.checkAssignedAnswers).mockRejectedValue(new Error('Try checking again.'));
  const { result } = await open();
  act(() => result.current.changeProofAnswer(itemA, editedProof()));
  await act(async () => result.current.check(itemA));
  expect(result.current.error).toContain('Try checking again');
  expect(result.current.proofAnswers[itemA]).toEqual(editedProof());
  await act(async () => vi.advanceTimersByTimeAsync(10000));
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
  expect(result.current.dirty).toEqual([itemA]);
});
test('assignment changes abort pending saves and cannot mark a new draft saved from an old reply', async () => {
  let resolve!: (value: typeof proofSaved) => void;
  vi.mocked(api.saveAssignedAnswers).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result, rerender } = await open();
  act(() => result.current.changeProofAnswer(itemA, editedProof()));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.save(itemA);
  });
  const signal = vi.mocked(api.saveAssignedAnswers).mock.calls[0]![2];
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...proofWork, id: itemB },
    attempt: null,
  });
  await act(async () => rerender({ id: itemB }));
  expect(signal.aborted).toBe(true);
  await act(async () => {
    resolve(proofSaved);
    await pending;
  });
  expect(result.current.attempt).toBeNull();
  expect(result.current.proofAnswers).toEqual({});
  expect(result.current.dirty).toEqual([]);
});
