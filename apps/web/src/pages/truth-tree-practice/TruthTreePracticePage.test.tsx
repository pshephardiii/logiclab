import type { ReactNode } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork as render } from '../../../test/unsaved-work';
import { TruthTreePracticePage } from './TruthTreePracticePage';

vi.mock('../../components/layout/Page', () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
installDialogStub();
function protectedWork() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

async function begin(conclusion = 'P') {
  const user = userEvent.setup();
  render(<TruthTreePracticePage />);
  await user.type(screen.getByLabelText('New premise'), 'P');
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.type(screen.getByLabelText('Conclusion'), conclusion);
  await user.click(screen.getByRole('button', { name: 'Begin truth-tree practice' }));
  return user;
}

test('valid independent work checks explicitly, hides stale diagnostics and protects start-over without persistence', async () => {
  const user = await begin();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  const witnesses = within(screen.getByLabelText('Witness 1')).getAllByRole('option');
  await user.selectOptions(
    screen.getByLabelText('Witness 1'),
    witnesses[1]!.getAttribute('value')!,
  );
  expect(screen.getByRole('button', { name: 'Check tree' })).toBeDisabled();
  await user.selectOptions(
    screen.getByLabelText('Witness 2'),
    witnesses[2]!.getAttribute('value')!,
  );
  await user.click(screen.getByRole('button', { name: 'Close branch' }));
  await user.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Argument: valid',
  );
  expect(protectedWork()).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Reopen branch' }));
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Start over' }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByRole('region', { name: 'Truth tree' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Start over' }));
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(protectedWork()).toBe(false);
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

test('a completed open counterexample refutes an argument without revealing a supplied reference', async () => {
  const user = await begin('Q');
  await user.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Tree check: verified. Argument: invalid.',
  );
  expect(screen.getByText(/Counterexample: P = T, Q = F/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save problem' })).not.toBeInTheDocument();
  expect(screen.queryByText('Instructor reference tree')).not.toBeInTheDocument();
});

test('invalid setup retains the entered statement without starting a malformed tree', async () => {
  const user = await begin('P &');
  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P ∧');
  expect(screen.queryByRole('region', { name: 'Truth tree' })).not.toBeInTheDocument();
});
