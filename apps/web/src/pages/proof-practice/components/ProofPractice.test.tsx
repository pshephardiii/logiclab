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
      screen.getByLabelText(format === 'tree' ? 'Formula for node 1' : 'Formula for line 2'),
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

  fireEvent.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit line 1' }));
  fireEvent.change(screen.getByLabelText('Formula for line 1'), { target: { value: 'Q' } });
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('region', { name: 'Proof feedback' })).toHaveTextContent(
    'Proof needs attention.',
  );
});

test.each(['dependency', 'fitch'])(
  'pending %s entry hides old feedback and requires Add line or discard before checking',
  async (format) => {
    await enterProblem(format);
    fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
    expect(screen.getByText('Proof verified.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Formula for line 2'), { target: { value: 'Q ∧' } });
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
    expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', {
        name: format === 'fitch' ? 'Entered Fitch proof' : 'Entered dependency proof',
      }),
    ).not.toHaveTextContent('Q ∧');
    if (format === 'fitch' || format === 'dependency') {
      expect(screen.getByRole('button', { name: 'Add line' })).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Rule for line 2'), {
        target: { value: 'excluded_middle' },
      });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Add line' }));
    expect(
      screen.getByRole('region', {
        name: format === 'fitch' ? 'Entered Fitch proof' : 'Entered dependency proof',
      }),
    ).toHaveTextContent('Q ∧');
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
    expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  },
);

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
  if (from !== 'tree') {
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

test('pending tree nodes hide previous feedback and remain intact when restarting is cancelled', async () => {
  await enterProblem('tree');
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('region', { name: 'Proof feedback' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'New assumption node' }));
  fireEvent.change(screen.getByLabelText('Formula for node 2'), { target: { value: '~Q' } });
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('¬Q');
  fireEvent.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Edit node 2' })).not.toBeInTheDocument();
});

test('changing the Fitch practice conclusion preserves confirmed and pending proof entries and requires a fresh explicit check', async () => {
  await enterProblem();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 2'), 'P');
  await user.selectOptions(screen.getByLabelText('Rule for line 2'), 'reiteration');
  const citation = screen.getByLabelText('Line 2 citation 1');
  const premise = within(citation)
    .getAllByRole('option')
    .find((option) => option.getAttribute('value') && !option.hasAttribute('disabled'))!;
  const premiseId = premise.getAttribute('value')!;
  await user.selectOptions(citation, premiseId);
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  expect(screen.getByLabelText('New conclusion')).toHaveFocus();
  await user.clear(screen.getByLabelText('New conclusion'));
  await user.type(screen.getByLabelText('New conclusion'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Apply conclusion' }));
  expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('Q');
  expect(screen.getByRole('button', { name: 'Edit conclusion' })).toHaveFocus();
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P');
  expect(screen.getByLabelText('Line 2 citation 1')).toHaveValue(premiseId);
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('region', { name: 'Proof feedback' })).toHaveTextContent(
    'The conclusion is not established.',
  );
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  await user.clear(screen.getByLabelText('New conclusion'));
  await user.type(screen.getByLabelText('New conclusion'), 'P{Enter}');
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
});

test('invalid or cancelled target edits leave the active conclusion, proof and earlier check unchanged', async () => {
  await enterProblem();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('New conclusion'));
  await user.click(screen.getByRole('button', { name: 'Apply conclusion' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a conclusion');
  await user.type(screen.getByLabelText('New conclusion'), 'P &');
  await user.click(screen.getByRole('button', { name: 'Apply conclusion' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('P');
  await user.keyboard('{Escape}');
  expect(screen.queryByLabelText('New conclusion')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit conclusion' })).toHaveFocus();
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  expect(screen.getByLabelText('New conclusion')).toHaveValue('P');
  await user.clear(screen.getByLabelText('New conclusion'));
  await user.type(screen.getByLabelText('New conclusion'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('P');
});

test('discarding a practice session while editing its conclusion resets edit/check state for the next proof', async () => {
  await enterProblem();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  await user.click(screen.getByRole('button', { name: 'Start over' }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('New conclusion')).toHaveValue('P');
  await user.click(screen.getByRole('button', { name: 'Start over' }));
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  await user.type(screen.getByLabelText('Conclusion'), 'P -> P');
  await user.click(screen.getByRole('button', { name: 'Begin proof practice' }));
  expect(screen.queryByLabelText('New conclusion')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
});

test('editing an original Fitch practice premise updates its supplied statement without rewriting derived lines', async () => {
  await enterProblem();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Formula for line 2'), 'P');
  await user.selectOptions(screen.getByLabelText('Rule for line 2'), 'reiteration');
  const citation = screen.getByLabelText('Line 2 citation 1');
  const id = within(citation)
    .getAllByRole('option')
    .find((option) => option.getAttribute('value') && !option.hasAttribute('disabled'))!
    .getAttribute('value')!;
  await user.selectOptions(citation, id);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
  expect(screen.queryByLabelText('Statement premise for line 1')).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Formula for line 1'));
  await user.type(screen.getByLabelText('Formula for line 1'), 'Q');
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.queryByText(/Premise formula does not match/)).not.toBeInTheDocument();
  expect(screen.getByText('Proof needs attention.')).toBeInTheDocument(); // The retained P reiteration is now wrong.
  await user.click(screen.getByRole('button', { name: 'Actions for line 2' }));
  await user.click(screen.getByRole('button', { name: 'Edit line 2' }));
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P');
  expect(screen.getByLabelText('Line 2 citation 1')).toHaveValue(id);
  await user.clear(screen.getByLabelText('Formula for line 2'));
  await user.type(screen.getByLabelText('Formula for line 2'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  await user.clear(screen.getByLabelText('New conclusion'));
  await user.type(screen.getByLabelText('New conclusion'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Apply conclusion' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
});

test('editing one of two identical premise formulas follows its source identity and recovers from incomplete text', async () => {
  const user = userEvent.setup();
  await enterProblem('fitch', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
    fireEvent.change(screen.getByLabelText('Premise 2'), { target: { value: 'P' } });
  });
  await user.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
  await user.clear(screen.getByLabelText('Formula for line 1'));
  await user.type(screen.getByLabelText('Formula for line 1'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument(); // The second premise P is unchanged and is the target.
  await user.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
  await user.clear(screen.getByLabelText('Formula for line 1'));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof could not be fully checked.')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 1'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
});

test('dependency practice can edit its target and original premise without resetting confirmed or pending work', async () => {
  await enterProblem('dependency');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 2'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  await user.clear(screen.getByLabelText('New conclusion'));
  await user.type(screen.getByLabelText('New conclusion'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Apply conclusion' }));
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('Q');
  expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('Q');
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof needs attention.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
  expect(screen.queryByLabelText('Statement premise for line 1')).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Formula for line 1'));
  await user.type(screen.getByLabelText('Formula for line 1'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.queryByText(/Premise formula does not match/)).not.toBeInTheDocument();
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
});

test('dependency practice premise edits distinguish identical sources and recover from invalid target edits', async () => {
  await enterProblem('dependency', async () => {
    fireEvent.change(screen.getByLabelText('New premise'), { target: { value: 'P' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
  });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
  await user.clear(screen.getByLabelText('Formula for line 1'));
  await user.type(screen.getByLabelText('Formula for line 1'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Edit conclusion' }));
  await user.clear(screen.getByLabelText('New conclusion'));
  await user.type(screen.getByLabelText('New conclusion'), 'P &');
  await user.click(screen.getByRole('button', { name: 'Apply conclusion' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('P');
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();
});
