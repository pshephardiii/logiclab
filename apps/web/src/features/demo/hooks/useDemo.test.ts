import { renderHook, act, waitFor } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import { useDemo } from './useDemo';
import { loadDemoSession, demoAction } from '../../../api/demo/api';
vi.mock('../../../api/demo/api', () => ({
  loadDemoSession: vi.fn(),
  demoAction: vi.fn(),
  endDemo: vi.fn(),
}));
const initial = {
  mode: 'demo' as const,
  user: { id: 'user', role: 'instructor' as const },
  workspace: { id: 'workspace', generation: 1 },
  notice: 'Synthetic',
};
test('restores a demo and reconciles a lost reset response with the server', async () => {
  vi.mocked(loadDemoSession).mockResolvedValueOnce(initial).mockResolvedValueOnce(null);
  vi.mocked(demoAction).mockRejectedValueOnce(new Error('Network failed'));
  const { result } = renderHook(() => useDemo(true));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(result.current.session).toEqual(initial);
  await act(async () => {
    expect(await result.current.run('reset')).toBe(false);
  });
  expect(result.current.session).toBeNull();
  expect(result.current.error).toBe('Network failed');
});
test('leaving demo pages cancels pending restoration and ignores its late response', async () => {
  let finish!: (value: typeof initial) => void;
  vi.mocked(loadDemoSession).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender } = renderHook(({ enabled }) => useDemo(enabled), {
    initialProps: { enabled: true },
  });
  const signal = vi.mocked(loadDemoSession).mock.calls.at(-1)![0];
  rerender({ enabled: false });
  expect(signal.aborted).toBe(true);
  await act(async () => {
    finish(initial);
  });
  expect(result.current.session).toBeNull();
  expect(result.current.busy).toBe(false);
});
