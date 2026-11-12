import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FitchLineActions } from './FitchLineActions';

function setup(index = 1) {
  const onMove = vi.fn(),
    onEdit = vi.fn(),
    onSettings = vi.fn(),
    onDelete = vi.fn(),
    onRange = vi.fn();
  render(
    <FitchLineActions
      index={index}
      count={3}
      disabled={false}
      onEdit={onEdit}
      onMove={onMove}
      onSettings={onSettings}
      onDelete={onDelete}
      onRange={onRange}
    />,
  );
  return { user: userEvent.setup(), onMove, onEdit, onSettings, onDelete, onRange };
}

test('Move groups both directions while Edit and the Delete group stay directly accessible; choosing a move closes both levels', async () => {
  const { user, onMove } = setup();
  await user.click(screen.getByRole('button', { name: 'Actions for line 2' }));
  expect(screen.getByRole('button', { name: 'Edit line 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete line 2' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Move line 2 up' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Move line' }));
  expect(screen.getByRole('group', { name: 'Actions for line 2' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Move line 2 down' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Move line 2 up' }));
  expect(onMove).toHaveBeenCalledExactlyOnceWith(-1);
  expect(screen.getByRole('button', { name: 'Actions for line 2' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(screen.queryByRole('group', { name: 'Move line options' })).not.toBeInTheDocument();
});

test('ArrowRight opens and focuses an available action; Escape/ArrowLeft return to the parent without invoking anything', async () => {
  const { user, onMove } = setup(0);
  await user.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  const move = screen.getByRole('button', { name: 'Move line' });
  move.focus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('button', { name: 'Move line 1 up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move line 1 down' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(move).toHaveFocus();
  expect(screen.getByRole('group', { name: 'Actions for line 1' })).toBeVisible();
  expect(screen.queryByRole('group', { name: 'Move line options' })).not.toBeInTheDocument();
  await user.keyboard('{ArrowRight}{ArrowLeft}');
  expect(move).toHaveFocus();
  expect(onMove).not.toHaveBeenCalled();
});

test('Subproof has applicable settings, Back retains the parent and parent close resets all submenus', async () => {
  const { user, onSettings } = setup();
  const trigger = screen.getByRole('button', { name: 'Actions for line 2' });
  await user.click(trigger);
  const subproof = screen.getByRole('button', { name: 'Subproof' });
  await user.click(subproof);
  const options = screen.getByRole('group', { name: 'Subproof options' });
  expect(within(options).queryByRole('button', { name: /Close subproof/ })).not.toBeInTheDocument();
  await user.click(within(options).getByRole('button', { name: '‹ Back to line actions' }));
  expect(subproof).toHaveFocus();
  await user.click(subproof);
  await user.click(trigger);
  await user.click(trigger);
  expect(screen.queryByRole('group', { name: 'Subproof options' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Subproof' }));
  await user.click(screen.getByRole('button', { name: 'Subproof settings for line 2' }));
  expect(onSettings).toHaveBeenCalledOnce();
});

test('mouse hover reveals options without running an action and another group replaces the first', async () => {
  const { user, onMove, onSettings } = setup();
  await user.click(screen.getByRole('button', { name: 'Actions for line 2' }));
  await user.hover(screen.getByRole('button', { name: 'Move line' }));
  expect(screen.getByRole('group', { name: 'Move line options' })).toBeVisible();
  await user.hover(screen.getByRole('button', { name: 'Subproof' }));
  await waitFor(() =>
    expect(screen.queryByRole('group', { name: 'Move line options' })).not.toBeInTheDocument(),
  );
  expect(screen.getByRole('group', { name: 'Subproof options' })).toBeVisible();
  expect(onMove).not.toHaveBeenCalled();
  expect(onSettings).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('group', { name: 'Subproof options' }), { key: 'Escape' });
});

test('Delete groups single-line and range actions while preserving their distinct callbacks', async () => {
  const { user, onDelete, onRange } = setup();
  const trigger = screen.getByRole('button', { name: 'Actions for line 2' });
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('group', { name: 'Delete options' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Delete a range starting at line 2' }));
  expect(onRange).toHaveBeenCalledOnce();
  expect(onDelete).not.toHaveBeenCalled();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  await user.click(screen.getByRole('button', { name: 'Delete line 2' }));
  expect(onDelete).toHaveBeenCalledOnce();
  expect(onRange).toHaveBeenCalledOnce();
});

test('assumption deletion offers its whole subproof and range without enabling unsafe single-line removal', async () => {
  const onDeleteSubproof = vi.fn();
  render(
    <FitchLineActions
      index={0}
      count={2}
      disabled={false}
      onEdit={vi.fn()}
      onRange={vi.fn()}
      onDeleteSubproof={onDeleteSubproof}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Actions for line 1' }));
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.queryByRole('button', { name: 'Delete line 1' })).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Delete a range starting at line 1' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Delete subproof at line 1' }));
  expect(onDeleteSubproof).toHaveBeenCalledOnce();
});
