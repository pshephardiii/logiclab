import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router';
import { installDialogStub, renderWithUnsavedWork as render } from '../../../test/unsaved-work';
import { useUnsavedWork } from '../../features/unsaved-work/hooks/useUnsavedWork';
import { test, expect, vi } from 'vitest';
import { DemoPage } from './DemoPage';
import { useAccountContext } from '../../features/auth/AccountProvider';
vi.mock('../../features/auth/AccountProvider', () => ({ useAccountContext: vi.fn() }));
installDialogStub();
function DirtyEditor() {
  useUnsavedWork(true);
  return null;
}
function fixture(active = false, dirty = false) {
  const run = vi.fn().mockResolvedValue(true);
  vi.mocked(useAccountContext).mockReturnValue({
    user: null,
    demoMode: true,
    demo: { session: active ? { user: { role: 'student' } } : null, busy: false, error: null, run },
  } as unknown as ReturnType<typeof useAccountContext>);
  render(
    <>
      {dirty && <DirtyEditor />}
      <Routes>
        <Route path="/" element={<DemoPage />} />
        <Route path="/demo/classes" element={<p>Instructor destination</p>} />
        <Route path="/demo/work" element={<p>Student destination</p>} />
      </Routes>
    </>,
  );
  return run;
}
test('explains synthetic data and starts a demo without asking for account credentials', async () => {
  const run = fixture();
  expect(screen.getByText(/Payments are simulated/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Explore as instructor' }));
  await screen.findByText('Instructor destination');
  expect(run).toHaveBeenCalledWith('start', 'instructor');
});
test('existing demos switch roles in the same workspace', async () => {
  const run = fixture(true);
  fireEvent.click(screen.getByRole('button', { name: 'Explore as student' }));
  await screen.findByText('Student destination');
  expect(run).toHaveBeenCalledWith('role', 'student');
});
test('reset and logout are separate explicit actions', async () => {
  const run = fixture(true);
  fireEvent.click(screen.getByRole('button', { name: 'Reset demo and discard changes' }));
  await waitFor(() => expect(run).toHaveBeenCalledWith('reset'));
  fireEvent.click(screen.getByRole('button', { name: 'End demo' }));
  await waitFor(() => expect(run).toHaveBeenCalledWith('logout'));
});

test.each([
  ['Explore as instructor', 'role', 'instructor'],
  ['Explore as student', 'role', 'student'],
  ['Reset demo and discard changes', 'reset', undefined],
  ['End demo', 'logout', undefined],
] as const)(
  '%s waits for consent and Stay never invokes the session action',
  async (label, action, role) => {
    const run = fixture(true, true);
    fireEvent.click(screen.getByRole('button', { name: label }));
    await screen.findByRole('dialog');
    expect(run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    if (role) expect(run).toHaveBeenCalledWith(action, role);
    else expect(run).toHaveBeenCalledWith(action);
  },
);

test('a failed demo action does not navigate or grant a persistent discard bypass', async () => {
  const run = fixture(true, true);
  run.mockResolvedValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Explore as instructor' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Instructor destination')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'End demo' }));
  await screen.findByRole('dialog');
  expect(run).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
});
