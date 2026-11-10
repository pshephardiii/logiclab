import { lineAction, openDependencies } from '../../../../test/proof-controls';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DependencyProof } from '@logiclab/contracts';
import { DependencyProofEditor } from './DependencyProofEditor';

const source = '11111111-1111-4111-8111-111111111111';
const inference = '22222222-2222-4222-8222-222222222222';
const statement = { premises: [], rules: [{ id: 'reiteration', label: 'Repeat' }] };

function setup() {
  const initial: DependencyProof = {
    proofVersion: 1,
    format: 'dependency',
    steps: [
      { id: source, kind: 'assumption', formula: 'P', dependencies: [source] },
      {
        id: inference,
        kind: 'inference',
        formula: 'P',
        dependencies: [source],
        ruleId: 'reiteration',
        lineReferences: [source],
        discharges: [],
      },
    ],
  };
  const onChange = vi.fn();
  const onPendingChange = vi.fn();

  function Harness() {
    const [proof, setProof] = useState<DependencyProof | null>(initial);
    return (
      <DependencyProofEditor
        statement={statement}
        onPendingChange={onPendingChange}
        proof={proof}
        purpose="student"
        onChange={(next) => {
          setProof(next);
          onChange(next);
        }}
      />
    );
  }

  render(<Harness />);
  return { user: userEvent.setup(), onChange, onPendingChange, initial };
}

test('starts with a clean blank bottom row and opens existing work through line actions', async () => {
  const { user, onChange, onPendingChange } = setup();
  const display = screen.getByRole('region', { name: 'Entered dependency proof' });
  expect(display).toHaveTextContent('Repeat · 1');
  expect(screen.getByLabelText('Formula for line 3')).toHaveValue('');
  expect(onChange).not.toHaveBeenCalled();
  expect(onPendingChange).toHaveBeenLastCalledWith(false);
  expect(screen.queryByRole('option', { name: 'Premise' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'New premise line' })).not.toBeInTheDocument();
  await lineAction(user, 2, 'Edit line 2');
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P');
  expect(screen.getByLabelText('Formula for line 2')).toHaveFocus();
  await lineAction(user, 2, 'Edit line 2');
  expect(screen.getByLabelText('Formula for line 2')).toHaveFocus();
  await user.type(screen.getByLabelText('Formula for line 2'), ' &');
  expect(onChange.mock.lastCall![0].steps[1]).toMatchObject({ id: inference, formula: 'P &' });
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  expect(screen.getByLabelText('Formula for line 3')).toHaveValue('');
});

test('three-dot actions preserve references and keep the edited identity after moves/deletion', async () => {
  const { user, onChange, initial } = setup();
  await lineAction(user, 2, 'Edit line 2');
  await lineAction(user, 2, 'Move line 2 up');
  expect(screen.getByLabelText('Rule for line 1')).toHaveValue('reiteration');
  expect(onChange.mock.lastCall![0].steps[0]).toEqual(initial.steps[1]);
  await lineAction(user, 2, 'Delete line 2');
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(screen.getByRole('region', { name: 'Entered dependency proof' })).toHaveTextContent(
    'Missing line',
  );
  expect(onChange.mock.lastCall![0].steps).toEqual([initial.steps[1]]);
});

test('Insert before uses automatic numbering and confirms incomplete work without adding a premise', async () => {
  const { user, onChange, initial } = setup();
  await lineAction(user, 1, 'Insert before line 1');
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  const next = onChange.mock.lastCall![0] as DependencyProof;
  expect(next.steps.slice(1)).toEqual(initial.steps);
  expect(next.steps[0]).toMatchObject({ kind: 'inference', formula: '', ruleId: null });
  expect(screen.getByLabelText('Formula for line 4')).toHaveValue('');
});

test('the dependency dropdown preserves explicit empty support and pending entry until Add/Discard', async () => {
  const { user, onChange, onPendingChange } = setup();
  await user.type(screen.getByLabelText('Formula for line 3'), 'Q');
  const sources = await openDependencies(user, 3);
  await user.click(within(sources).getByRole('checkbox', { name: '1. P' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(onPendingChange).toHaveBeenLastCalledWith(true);
  expect(screen.getByRole('button', { name: 'Actions for line 1' })).toBeDisabled();
  await user.click(within(sources).getByRole('checkbox', { name: '1. P' }));
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(onChange.mock.lastCall![0].steps[2]).toMatchObject({ formula: 'Q', dependencies: [] });
  expect(screen.getByLabelText('Formula for line 4')).toHaveFocus();
});

test('changing between Assumption and an inference retains typed formula and rule citations', async () => {
  const { user, onChange } = setup();
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), source);
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), '__assumption__');
  expect(screen.getByLabelText('Formula for line 3')).toHaveValue('P');
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'reiteration');
  expect(screen.getByLabelText('Line 3 citation 1')).toHaveValue(source);
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Formula for line 3')).toHaveFocus();
});

test('a replacement proof cannot be overwritten by a pending row', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const proof: DependencyProof = { proofVersion: 1, format: 'dependency', steps: [] };
  const props = { statement, proof, onChange };
  const view = render(<DependencyProofEditor {...props} />);
  await user.type(screen.getByLabelText('Formula for line 1'), 'P');
  view.rerender(<DependencyProofEditor {...props} proof={{ ...proof }} />);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('proof changed');
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P');
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
