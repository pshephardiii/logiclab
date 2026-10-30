import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { PublishedProblemVersion } from '@logiclab/contracts';
import { listProblems, listVersions } from '../../../api/problems/api';
import { usePublishedProblemChoices } from './usePublishedProblemChoices';

vi.mock('../../../api/problems/api', () => ({ listProblems: vi.fn(), listVersions: vi.fn() }));
const version: PublishedProblemVersion = {
  id: '11111111-1111-4111-8111-111111111111',
  problemId: '22222222-2222-4222-8222-222222222222',
  title: 'Snapshot',
  instructions: null,
  definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  version: 1,
  publishedAt: '2026-10-16T12:00:00.000Z',
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listProblems).mockResolvedValue({ problems: [], nextOffset: null });
});

test('switching problems cancels history reads and ignores late versions', async () => {
  let resolve!: (value: { versions: PublishedProblemVersion[]; nextOffset: null }) => void;
  vi.mocked(listVersions)
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce({ versions: [], nextOffset: null });
  const hook = renderHook(() => usePublishedProblemChoices());
  await waitFor(() => expect(hook.result.current.problemLoading).toBe(false));
  act(() => hook.result.current.selectProblem('first'));
  await waitFor(() => expect(listVersions).toHaveBeenCalledTimes(1));
  const firstSignal = vi.mocked(listVersions).mock.calls[0]![2];
  act(() => hook.result.current.selectProblem('second'));
  await waitFor(() => expect(hook.result.current.versionLoading).toBe(false));
  expect(firstSignal.aborted).toBe(true);
  await act(async () => resolve({ versions: [version], nextOffset: null }));
  expect(hook.result.current.versions).toEqual([]);
  const latestSignal = vi.mocked(listVersions).mock.calls.at(-1)![2];
  hook.unmount();
  expect(latestSignal.aborted).toBe(true);
});

test('publication pagination retains earlier snapshots and failed loads can be retried', async () => {
  vi.mocked(listVersions)
    .mockRejectedValueOnce(new Error('History unavailable'))
    .mockResolvedValueOnce({ versions: [version], nextOffset: 20 })
    .mockResolvedValueOnce({
      versions: [{ ...version, id: '33333333-3333-4333-8333-333333333333', version: 2 }],
      nextOffset: null,
    });
  const hook = renderHook(() => usePublishedProblemChoices());
  act(() => hook.result.current.selectProblem(version.problemId));
  await waitFor(() => expect(hook.result.current.versionError).toBe('History unavailable'));
  await act(async () => {
    await hook.result.current.loadVersions();
  });
  expect(hook.result.current.versions).toHaveLength(1);
  await act(async () => {
    await hook.result.current.loadVersions(20);
  });
  expect(hook.result.current.versions).toHaveLength(2);
  expect(hook.result.current.versionNext).toBeNull();
});

test('mixed library pages retain supported history but exclude derivation versions from assignments', async () => {
  const { derivationDraft } = await import('../../../../test/derivation');
  vi.mocked(listProblems).mockResolvedValue({ problems: [derivationDraft], nextOffset: 20 });
  vi.mocked(listVersions)
    .mockResolvedValueOnce({
      versions: [{ ...version, definition: derivationDraft.definition }],
      nextOffset: 20,
    })
    .mockResolvedValueOnce({ versions: [version], nextOffset: null });
  const hook = renderHook(() => usePublishedProblemChoices());
  await waitFor(() => expect(hook.result.current.problems).toHaveLength(1));
  expect(hook.result.current.problemNext).toBe(20);
  act(() => hook.result.current.selectProblem(derivationDraft.id));
  await waitFor(() => expect(hook.result.current.versionNext).toBe(20));
  expect(hook.result.current.versions).toEqual([]);
  await act(async () => {
    await hook.result.current.loadVersions(20);
  });
  expect(hook.result.current.versions).toEqual([version]);
  expect(hook.result.current.versionNext).toBeNull();
});
