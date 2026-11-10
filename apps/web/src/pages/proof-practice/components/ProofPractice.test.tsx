import userEvent from '@testing-library/user-event';
import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Link } from 'react-router';
import { ProofPractice } from './ProofPractice';
import { installDialogStub, renderWithUnsavedWork } from '../../../../test/unsaved-work';

installDialogStub();

async function enterProblem(format = 'fitch', configure?: () => Promise<void>) {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: format } });
  if (format === 'dependency') {
    fireEvent.change(screen.getByLabelText('New premise'), { target: { value: 'P' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
  } else {
    fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
    fireEvent.change(screen.getByLabelText('Premise 1'), { target: { value: 'P' } });
  }
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P' } });
  await configure?.();
  const rules = screen.queryByRole('dialog', { name: 'Permitted rules' });
  if (rules) fireEvent.click(within(rules).getByRole('button', { name: 'Done' }));
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
}

test.each(['fitch', 'dependency', 'tree'])(
  '%s practice starts locally and checks only on request',
  async (format) => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
    await enterProblem(format);

    expect(screen.queryByLabelText('Proof format')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Start proof' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('P');
    expect(
      screen.getByLabelText(
        format === 'tree'
          ? 'Formula for node 1'
          : format === 'dependency'
            ? 'Formula for line 2'
            : 'Formula for line 1',
      ),
    ).toHaveAccessibleDescription(/Contradiction: type _\|_ for ⊥/);
    expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));

    expect(screen.getByRole('region', { name: 'Proof feedback' })).toHaveTextContent(
      format === 'tree' ? 'Proof needs attention.' : 'Proof verified.',
    );
    expect(fetch).not.toHaveBeenCalled();
  },
);

test('editing clears old diagnostics and never checks automatically', async () => {
  await enterProblem();
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

test('pending dependency entry hides old feedback and requires Add line or discard before checking', async () => {
  await enterProblem('dependency');
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Formula for line 2'), { target: { value: 'Q ∧' } });
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Entered dependency proof' })).not.toHaveTextContent(
    'Q ∧',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add line' }));
  expect(screen.getByRole('region', { name: 'Entered dependency proof' })).toHaveTextContent('Q ∧');
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
])('%s → %s requires consent and resets the entire practice session', async (from, to) => {
  await enterProblem(from, async () => {
    fireEvent.click(screen.getByText('Permitted rules (19 selected)'));
    await screen.findByRole('dialog', { name: 'Permitted rules' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reiteration' }));
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  const feedback = screen.getByRole('region', { name: 'Proof feedback' }).textContent;

  fireEvent.change(screen.getByLabelText('Change proof format'), { target: { value: to } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Change proof format')).toHaveValue(from);
  expect(screen.getByRole('region', { name: 'Proof feedback' }).textContent).toBe(feedback);
  if (from === 'dependency') {
    expect(
      screen.getByRole('table', { name: 'Entered proof' }).querySelector('tbody'),
    ).toHaveTextContent('P');
  } else expect(screen.getByDisplayValue('P')).toBeInTheDocument();

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
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
  expect(screen.queryByDisplayValue('P')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
});

test('reselecting the active format is a no-op; Start over confirms a same-format reset', async () => {
  await enterProblem('dependency');
  fireEvent.change(screen.getByLabelText('Change proof format'), {
    target: { value: 'dependency' },
  });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.getByRole('table', { name: 'Entered proof' }).querySelector('tbody'),
  ).toHaveTextContent('P');

  fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }),
  );
  expect(screen.getByLabelText('Proof format')).toHaveValue('dependency');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByLabelText('Premise 1')).not.toBeInTheDocument();
});

test('changing format during setup protects fields, selected rules and validation errors', async () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
  fireEvent.change(screen.getByLabelText('Premise 1'), { target: { value: 'P' } });
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P ∧' } });
  fireEvent.click(screen.getByText('Permitted rules (19 selected)'));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reiteration' }));
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');

  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'tree' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Proof format')).toHaveValue('fitch');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P ∧');
  expect(screen.getByLabelText('Premise 1')).toHaveValue('P');
  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');
  fireEvent.click(screen.getByText('Permitted rules (18 selected)'));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  expect(screen.getByRole('checkbox', { name: 'Reiteration' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));

  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'tree' } });
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }),
  );
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByLabelText('Premise 1')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Permitted rules (19 selected)'));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  expect(screen.getByRole('checkbox', { name: 'Reiteration' })).toBeChecked();
});

test('an untouched setup changes format freely, but rule-only edits require confirmation', async () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'tree' } });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');

  fireEvent.click(screen.getByText('Permitted rules (19 selected)'));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reiteration' }));
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: 'dependency' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');
  fireEvent.click(screen.getByText('Permitted rules (18 selected)'));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  expect(screen.getByRole('checkbox', { name: 'Reiteration' })).not.toBeChecked();
});

test('malformed setup retains the entered fields with an actionable error', () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P ∧' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P ∧');
  expect(screen.queryByRole('button', { name: 'Start proof' })).not.toBeInTheDocument();
  expect(screen.getByText(/Work is temporary/)).toBeInTheDocument();
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
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);

  rendered.unmount();
  renderWithUnsavedWork(<ProofPractice />);
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
});

test('rules are organized in a modal and Escape retains choices without starting or checking a proof', async () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.click(screen.getByRole('button', { name: 'Permitted rules (19 selected)' }));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  const dialog = screen.getByRole('dialog', { name: 'Permitted rules' });
  expect(within(dialog).getByRole('group', { name: 'Core rules' })).toBeInTheDocument();
  expect(within(dialog).getByRole('group', { name: 'Derived rules' })).toBeInTheDocument();
  expect(within(dialog).getByRole('group', { name: 'Classical rules' })).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Clear selection' }));
  expect(
    within(dialog)
      .getAllByRole('checkbox')
      .every((input) => !(input as HTMLInputElement).checked),
  ).toBe(true);
  fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Reiteration' }));
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Permitted rules (1 selected)' })).toBeInTheDocument();
  expect(screen.getByRole('form', { name: 'Proof practice setup' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  const unloading = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unloading);
  expect(unloading.defaultPrevented).toBe(true);
});

test('beginning dependency practice puts the conclusion beside the proof without a duplicate premises panel', async () => {
  await enterProblem('dependency');
  expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('ConclusionP');
  expect(screen.queryByRole('heading', { name: 'Premises' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start proof' })).not.toBeInTheDocument();
  expect(
    screen.getByRole('table', { name: 'Entered proof' }).querySelector('tbody'),
  ).toHaveTextContent('P');
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('');
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
});

test('closing rule settings returns keyboard focus to its opener', async () => {
  const user = userEvent.setup();
  renderWithUnsavedWork(<ProofPractice />);
  const opener = screen.getByRole('button', { name: 'Permitted rules (19 selected)' });
  await user.click(opener);
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(opener).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('opening the rules modal leaves all rules selected; only a fresh checkbox click changes them', async () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.click(screen.getByRole('button', { name: 'Permitted rules (19 selected)' }));
  const dialog = await screen.findByRole('dialog', { name: 'Permitted rules' });
  const checkboxes = within(dialog).getAllByRole('checkbox');
  expect(checkboxes).toHaveLength(19);
  expect(checkboxes.every((input) => (input as HTMLInputElement).checked)).toBe(true);
  for (const operator of [
    'Conjunction',
    'Disjunction',
    'Implication',
    'Negation and contradiction',
    'Biconditional',
  ]) {
    expect(within(dialog).getByRole('group', { name: operator })).toBeInTheDocument();
  }
  const choice = within(dialog).getByRole('checkbox', { name: 'Conjunction introduction' });
  fireEvent.click(choice, { detail: 2 });
  expect(choice).toBeChecked();
  fireEvent.click(choice, { detail: 1 });
  expect(choice).not.toBeChecked();
});
