import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { installDialogStub } from '../../../../test/unsaved-work';
import { lineAction } from '../../../../test/proof-controls';
import { ProofPremisesEditor } from './ProofPremisesEditor';
installDialogStub();

function setup(initial: { id: string; formula: string }[] = []) {
  const changed = vi.fn(),
    pending = vi.fn();
  function Harness() {
    const [premises, setPremises] = useState(initial);
    return (
      <ProofPremisesEditor
        premises={premises}
        onChange={(next) => {
          setPremises(next);
          changed(next);
        }}
        onPendingChange={pending}
      />
    );
  }
  render(<Harness />);
  return { user: userEvent.setup(), changed, pending };
}

test('only confirmed nonblank inputs become premises; an untouched next row adds nothing', async () => {
  const { user, changed, pending } = setup();
  expect(screen.getByRole('button', { name: 'Add premise' })).toBeDisabled();
  expect(changed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(false);
  await user.type(screen.getByLabelText('New premise'), 'P');
  expect(changed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(true);
  await user.keyboard('{Enter}');
  expect(changed).toHaveBeenCalledOnce();
  expect(changed.mock.lastCall![0]).toEqual([{ id: expect.any(String), formula: 'P' }]);
  expect(screen.getByLabelText('New premise')).toHaveValue('');
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole('button', { name: 'Add premise' })).toBeDisabled();
  expect(
    screen.getByRole('region', { name: 'Problem premise diagram' }).querySelectorAll('tbody tr'),
  ).toHaveLength(1);
});

test('premise editing, moves and confirmed deletion preserve identities and cancellation preserves the list', async () => {
  const { user, changed } = setup([
    { id: 'first', formula: 'P' },
    { id: 'second', formula: 'Q' },
  ]);
  await lineAction(user, 2, 'Move line 2 up');
  await lineAction(user, 1, 'Edit line 1');
  await user.clear(screen.getByLabelText('Premise 1'));
  await user.type(screen.getByLabelText('Premise 1'), 'R');
  await user.click(screen.getByRole('button', { name: 'Update premise' }));
  expect(changed.mock.lastCall![0]).toEqual([
    { id: 'second', formula: 'R' },
    { id: 'first', formula: 'P' },
  ]);
  await lineAction(user, 1, 'Delete line 1');
  await user.click(screen.getByRole('button', { name: 'Keep premise' }));
  expect(changed.mock.lastCall![0]).toHaveLength(2);
  await lineAction(user, 1, 'Delete line 1');
  await user.click(screen.getByRole('button', { name: 'Delete premise' }));
  expect(changed.mock.lastCall![0]).toEqual([{ id: 'first', formula: 'P' }]);
});

test('discarding an unfinished premise does not alter confirmed sources', async () => {
  const { user, changed, pending } = setup([{ id: 'first', formula: 'P' }]);
  await user.type(screen.getByLabelText('New premise'), 'Q &');
  await user.click(screen.getByRole('button', { name: 'Discard premise' }));
  expect(changed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(screen.getByLabelText('New premise')).toHaveValue('');
});
