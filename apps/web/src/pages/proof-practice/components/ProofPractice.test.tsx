import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Link } from 'react-router';
import { ProofPractice } from './ProofPractice';
import { installDialogStub, renderWithUnsavedWork } from '../../../../test/unsaved-work';

installDialogStub();

function enterProblem(format = 'fitch', configure?: () => void) {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: format } });
  fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
  fireEvent.change(screen.getByLabelText('Premise 1'), { target: { value: 'P' } });
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P' } });
  configure?.();
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
}

test.each(['fitch', 'dependency', 'tree'])(
  '%s practice starts locally and checks only on request',
  (format) => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
    enterProblem(format);

    expect(screen.queryByLabelText('Proof format')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
    expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));

    expect(screen.getByRole('region', { name: 'Proof feedback' })).toHaveTextContent(
      format === 'tree' ? 'Proof needs attention.' : 'Proof verified.',
    );
    expect(fetch).not.toHaveBeenCalled();
  },
);

test('editing clears old diagnostics and never checks automatically', () => {
  enterProblem();
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Formula for line 1'), { target: { value: 'Q' } });
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('region', { name: 'Proof feedback' })).toHaveTextContent(
    'Proof needs attention.',
  );
});

test('pending dependency entry hides old feedback and requires Add line or discard before checking', () => {
  enterProblem('dependency');
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'New inference line' }));
  fireEvent.change(screen.getByLabelText('Formula for line 2'), { target: { value: 'Q &' } });
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Entered dependency proof' })).not.toHaveTextContent(
    'Q &',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add line' }));
  expect(screen.getByRole('region', { name: 'Entered dependency proof' })).toHaveTextContent('Q &');
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
});

test.each([
  ['fitch', 'dependency'],
  ['fitch', 'tree'],
  ['dependency', 'fitch'],
  ['dependency', 'tree'],
  ['tree', 'fitch'],
  ['tree', 'dependency'],
])('%s → %s requires consent and resets the entire practice session', (from, to) => {
  enterProblem(from, () => {
    fireEvent.click(screen.getByText('Permitted rules (19 selected)'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reiteration' }));
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  const feedback = screen.getByRole('region', { name: 'Proof feedback' }).textContent;

  fireEvent.change(screen.getByLabelText('Change proof format'), { target: { value: to } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Change proof format')).toHaveValue(from);
  expect(screen.getByRole('region', { name: 'Proof feedback' }).textContent).toBe(feedback);
  expect(screen.getByDisplayValue('P')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Change proof format'), { target: { value: to } });
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.getByLabelText('Change proof format')).toHaveValue(from);
  expect(screen.getByRole('region', { name: 'Proof feedback' }).textContent).toBe(feedback);

  fireEvent.change(screen.getByLabelText('Change proof format'), { target: { value: to } });
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }),
  );
  expect(screen.getByLabelText('Proof format')).toHaveValue(to);
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByLabelText('Premise 1')).not.toBeInTheDocument();
  expect(screen.getByText('Permitted rules (19 selected)')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start proof' })).not.toBeInTheDocument();
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(false);

  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'Q -> Q' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
  expect(screen.getByLabelText('Change proof format')).toHaveValue(to);
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  expect(screen.queryByDisplayValue('P')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
});

test('reselecting the active format is a no-op; Start over confirms a same-format reset', () => {
  enterProblem('dependency');
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  fireEvent.change(screen.getByLabelText('Change proof format'), {
    target: { value: 'dependency' },
  });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('P')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }),
  );
  expect(screen.getByLabelText('Proof format')).toHaveValue('dependency');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByLabelText('Premise 1')).not.toBeInTheDocument();
});

test('changing format during setup protects fields, selected rules and validation errors', () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
  fireEvent.change(screen.getByLabelText('Premise 1'), { target: { value: 'P' } });
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P &' } });
  fireEvent.click(screen.getByText('Permitted rules (19 selected)'));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reiteration' }));
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');

  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'tree' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Proof format')).toHaveValue('fitch');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P &');
  expect(screen.getByLabelText('Premise 1')).toHaveValue('P');
  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');
  expect(screen.getByRole('checkbox', { name: 'Reiteration' })).not.toBeChecked();

  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'tree' } });
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }),
  );
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByLabelText('Premise 1')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Reiteration' })).toBeChecked();
});

test('an untouched setup changes format freely, but rule-only edits require confirmation', () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'tree' } });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');

  fireEvent.click(screen.getByText('Permitted rules (19 selected)'));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reiteration' }));
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'dependency' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');
  expect(screen.getByRole('checkbox', { name: 'Reiteration' })).not.toBeChecked();
});

test('malformed setup retains the entered fields with an actionable error', () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P &' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P &');
  expect(screen.queryByRole('button', { name: 'Start proof' })).not.toBeInTheDocument();
  expect(screen.getByText(/does not search for a solution/)).toBeInTheDocument();
});

test('setup edits require discard consent before navigation', async () => {
  const { router } = renderWithUnsavedWork(
    <>
      <Link to="/elsewhere">Leave practice</Link>
      <ProofPractice />
    </>,
  );
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P' } });
  fireEvent.click(screen.getByRole('link', { name: 'Leave practice' }));

  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
  expect(router.state.location.pathname).toBe('/');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P');

  fireEvent.click(screen.getByRole('link', { name: 'Leave practice' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }),
  );
  expect(router.state.location.pathname).toBe('/elsewhere');
});

test('checked active work still requests an unload warning and does not persist through remount', () => {
  const rendered = renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P -> P' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);

  rendered.unmount();
  renderWithUnsavedWork(<ProofPractice />);
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
});
