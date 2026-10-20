import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { test, expect, vi } from 'vitest';
import { DemoPage } from './DemoPage';
import { useAccountContext } from '../../features/auth/AccountProvider';
vi.mock('../../features/auth/AccountProvider', () => ({ useAccountContext: vi.fn() }));
function fixture(active = false) {
  const run = vi.fn().mockResolvedValue(true);
  vi.mocked(useAccountContext).mockReturnValue({
    user: null,
    demoMode: true,
    demo: { session: active ? { user: { role: 'student' } } : null, busy: false, error: null, run },
  } as unknown as ReturnType<typeof useAccountContext>);
  render(
    <MemoryRouter initialEntries={['/demo']}>
      <Routes>
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/demo/classes" element={<p>Instructor destination</p>} />
        <Route path="/demo/work" element={<p>Student destination</p>} />
      </Routes>
    </MemoryRouter>,
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
