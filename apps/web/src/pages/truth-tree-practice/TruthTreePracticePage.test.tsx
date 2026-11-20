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
  await user.click(screen.getByRole('button', { name: 'Close branch 1' }));
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
  await user.click(screen.getByRole('radio', { name: 'Valid' }));
  await user.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Argument: valid',
  );
  expect(protectedWork()).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Reopen branch 1' }));
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
  await user.click(screen.getByRole('radio', { name: 'Invalid' }));
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

test('verdicts are never prefilled or announced before selection and changing a choice clears checked feedback', async () => {
  const user = await begin('Q');
  const valid = screen.getByRole('radio', { name: 'Valid' });
  const invalid = screen.getByRole('radio', { name: 'Invalid' });
  expect(valid).not.toBeChecked();
  expect(invalid).not.toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Check tree' }));
  const feedback = screen.getByRole('region', { name: 'Truth-tree feedback' });
  expect(feedback).toHaveTextContent('not answered');
  expect(feedback).not.toHaveTextContent('Argument:');
  expect(feedback).not.toHaveTextContent('Counterexample:');
  await user.click(valid);
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Validity verdict: incorrect.',
  );
  await user.click(invalid);
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Validity verdict: correct.',
  );
  await user.click(screen.getByRole('button', { name: 'Clear verdict' }));
  expect(valid).not.toBeChecked();
  expect(invalid).not.toBeChecked();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
});

test('setup highlights an unsupported character in the entered conclusion and clears it on edit', async () => {
  const user = await begin('P @ Q');
  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion · check character 3:');
  expect(screen.getByLabelText('Character to check')).toHaveTextContent('@');
  expect(screen.queryByText(/Unexpected character/)).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Truth tree' })).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Conclusion'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Conclusion'), 'P -> (Q ^ R)');
  await user.click(screen.getByRole('button', { name: 'Begin truth-tree practice' }));
  expect(screen.getByRole('region', { name: 'Truth tree' })).toHaveTextContent('¬(P → (Q ∧ R))');
});
