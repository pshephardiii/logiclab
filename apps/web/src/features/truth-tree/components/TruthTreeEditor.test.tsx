import { useState } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { checkTruthTree, isFinishedTruthTreeAttempt } from '@logiclab/logic-engine/truth-tree';
import { initialTruthTree, appendTruthTreeExpansion } from '../helpers/construction';
import { TruthTreeEditor } from './TruthTreeEditor';
import { installDialogStub } from '../../../../test/unsaved-work';

installDialogStub();

test('constructs and closes separate branches, uses ancestor citations and confirms undo of complete work', async () => {
  const problem = {
    ruleCatalogVersion: 1 as const,
    premises: [{ id: crypto.randomUUID(), formula: 'P v Q' }],
    conclusion: 'P',
  };
  const initial = initialTruthTree(problem);
  const changed = vi.fn();
  const pending = vi.fn();
  function Controlled() {
    const [tree, setTree] = useState(initial);
    return (
      <TruthTreeEditor
        tree={tree}
        onChange={(next) => {
          changed(next);
          setTree(next);
        }}
        onPendingChange={pending}
      />
    );
  }
  render(<Controlled />);
  const user = userEvent.setup();
  expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  expect(changed).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText('Source formula'), initial.occurrences[0]!.id);
  await user.selectOptions(screen.getByLabelText('Decomposition rule'), 'disjunction');
  await user.type(screen.getByLabelText('Formula 1 · Result 1.1'), 'P');
  expect(screen.getByRole('button', { name: 'Add expansion' })).toBeDisabled();
  await user.type(screen.getByLabelText('Formula 1 · Result 2.1'), 'Q{Enter}');
  expect(changed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(true);
  await user.click(screen.getByRole('button', { name: 'Add expansion' }));
  const split = changed.mock.calls.at(-1)![0] as typeof initial;
  expect(screen.getByRole('region', { name: 'Branch 1' })).toHaveTextContent(
    'Splits into branches 2 and 3',
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add step to branch 2' })).toHaveFocus(),
  );
  await user.click(screen.getByRole('button', { name: 'Close branch 2' }));
  const sources = screen.getByLabelText('Witness 1');
  expect(within(sources).getAllByRole('option')).toHaveLength(4); // none + two ancestors + this child's result
  await user.selectOptions(screen.getByLabelText('Witness 1'), initial.occurrences[1]!.id);
  await user.selectOptions(
    screen.getByLabelText('Witness 2'),
    split.branches[1]!.occurrenceIds[0]!,
  );
  await user.click(screen.getByRole('button', { name: 'Close branch' }));
  const closed = changed.mock.calls.at(-1)![0] as typeof initial;
  expect(checkTruthTree({ problem, tree: closed })).toMatchObject({
    status: 'verified',
    argumentStatus: 'invalid',
  });
  expect(isFinishedTruthTreeAttempt({ problem, tree: closed })).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Undo last expansion' }));
  await user.click(screen.getByRole('button', { name: 'Keep expansion' }));
  expect(changed).toHaveBeenLastCalledWith(closed);
  await user.click(screen.getByRole('button', { name: 'Undo last expansion' }));
  await user.click(screen.getByRole('button', { name: 'Undo expansion' }));
  expect(changed).toHaveBeenLastCalledWith(initial);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add step to branch 1' })).toHaveFocus(),
  );
});

test('unsafe saved structures remain visible without mutation controls', () => {
  const tree = { ...initialTruthTree({ premises: [], conclusion: 'P' }), rootBranchId: null };
  const changed = vi.fn();
  render(<TruthTreeEditor tree={tree} onChange={changed} />);
  expect(screen.getByRole('alert')).toHaveTextContent('unsafe structure');
  expect(screen.queryByRole('button', { name: /Add step to branch/ })).not.toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();
});

test('a pending branch entry cannot be moved to another path and discard restores branch actions without changing work', async () => {
  const initial = initialTruthTree({
    premises: [{ id: crypto.randomUUID(), formula: 'P v Q' }],
    conclusion: 'P',
  });
  const tree = appendTruthTreeExpansion(
    initial,
    initial.rootBranchId!,
    initial.occurrences[0]!.id,
    'disjunction',
    [['P'], ['Q']],
  );
  const changed = vi.fn();
  const pending = vi.fn();
  const user = userEvent.setup();
  render(<TruthTreeEditor tree={tree} onChange={changed} onPendingChange={pending} />);

  await user.click(screen.getByRole('button', { name: 'Close branch 2' }));
  expect(changed).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText('Witness 1'), initial.occurrences[1]!.id);
  expect(pending).toHaveBeenLastCalledWith(true);
  const otherBranch = screen.getByRole('button', { name: 'Add step to branch 3' });
  expect(otherBranch).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Undo last expansion' })).toBeDisabled();
  await user.click(otherBranch);
  expect(screen.getByRole('group', { name: 'Close branch 2' })).toBeInTheDocument();
  expect(screen.getByLabelText('Witness 1')).toHaveValue(initial.occurrences[1]!.id);

  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add step to branch 2' })).toHaveFocus(),
  );
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(otherBranch).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Undo last expansion' })).toBeEnabled();
  await user.click(otherBranch);
  await waitFor(() => expect(screen.getByLabelText('Source formula')).toHaveFocus());
  const options = within(screen.getByLabelText('Source formula')).getAllByRole('option');
  expect(options.map((option) => option.getAttribute('value'))).not.toContain(
    tree.branches[1]!.occurrenceIds[0],
  );
  expect(changed).not.toHaveBeenCalled();
});

test('a failed confirmation retains the branch entry and permits an explicit retry', async () => {
  const initial = initialTruthTree({
    premises: [{ id: crypto.randomUUID(), formula: 'P & Q' }],
    conclusion: 'R',
  });
  const changed = vi.fn();
  function Controlled() {
    const [tree, setTree] = useState(initial);
    return (
      <TruthTreeEditor
        tree={tree}
        onChange={(next) => {
          changed(next);
          if (changed.mock.calls.length === 1) throw new Error('Tree update unavailable.');
          setTree(next);
        }}
      />
    );
  }
  render(<Controlled />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  await user.selectOptions(screen.getByLabelText('Source formula'), initial.occurrences[0]!.id);
  await user.selectOptions(screen.getByLabelText('Decomposition rule'), 'conjunction');
  await user.type(screen.getByLabelText('Formula 1 · Result 1.1'), 'P');
  await user.type(screen.getByLabelText('Formula 2 · Result 1.2'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Add expansion' }));
  expect(
    within(screen.getByRole('group', { name: 'Add step to branch 1' })).getByRole('alert'),
  ).toHaveTextContent('Tree update unavailable.');
  expect(screen.getByLabelText('Formula 1 · Result 1.1')).toHaveValue('P');
  expect(screen.getByLabelText('Formula 2 · Result 1.2')).toHaveValue('Q');
  await user.click(screen.getByRole('button', { name: 'Add expansion' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add step to branch 1' })).toHaveFocus(),
  );
  expect(changed).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Source formula')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Formula 3')).toHaveValue('P');
  expect(screen.getByLabelText('Formula 4')).toHaveValue('Q');
});
