import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { checkTruthTree, isFinishedTruthTreeAttempt } from '@logiclab/logic-engine/truth-tree';
import { initialTruthTree } from '../helpers/construction';
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
  await user.selectOptions(screen.getByLabelText('Source formula'), initial.occurrences[0]!.id);
  await user.selectOptions(screen.getByLabelText('Decomposition rule'), 'disjunction');
  await user.type(screen.getByLabelText('Result 1.1'), 'P');
  expect(screen.getByRole('button', { name: 'Add expansion' })).toBeDisabled();
  await user.type(screen.getByLabelText('Result 2.1'), 'Q{Enter}');
  expect(changed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(true);
  await user.click(screen.getByRole('button', { name: 'Add expansion' }));
  const split = changed.mock.calls.at(-1)![0] as typeof initial;
  expect(screen.getByRole('region', { name: 'Branch 1' })).toHaveTextContent(
    'Splits into branches 2 and 3',
  );
  await user.selectOptions(screen.getByLabelText('Branch'), split.branches[1]!.id);
  const sources = screen.getByLabelText('Source formula');
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
});

test('unsafe saved structures remain visible without mutation controls', () => {
  const tree = { ...initialTruthTree({ premises: [], conclusion: 'P' }), rootBranchId: null };
  const changed = vi.fn();
  render(<TruthTreeEditor tree={tree} onChange={changed} />);
  expect(screen.getByRole('alert')).toHaveTextContent('unsafe structure');
  expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();
});
