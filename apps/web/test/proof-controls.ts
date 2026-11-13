import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type User = ReturnType<typeof userEvent.setup>;

export async function lineAction(user: User, line: number, action: string) {
  const trigger = screen.getByRole('button', { name: `Actions for line ${line}` });
  if (trigger.getAttribute('aria-expanded') !== 'true') await user.click(trigger);
  const group = screen.getByRole('group', { name: `Actions for line ${line}` });
  const submenuName = action.startsWith('Move line ')
    ? 'Move line'
    : /^(Subproof settings|Close subproof at|Reopen subproof at|Continue subproof at)/.test(action)
      ? 'Subproof'
      : action.startsWith('Delete ')
        ? 'Delete'
        : null;
  const submenu = submenuName ? within(group).queryByRole('button', { name: submenuName }) : null;
  if (submenu && submenu.getAttribute('aria-expanded') !== 'true') await user.click(submenu);
  await user.click(within(group).getByRole('button', { name: action }));
}

export async function openDependencies(user: User, line: number) {
  const trigger = screen.getByRole('button', { name: `Dependencies for line ${line}` });
  if (trigger.getAttribute('aria-expanded') !== 'true') await user.click(trigger);
  return screen.getByRole('group', { name: `Dependencies for line ${line}` });
}

export async function nodeAction(user: User, node: number, action: string) {
  const trigger = screen.getByRole('button', { name: `Actions for node ${node}` });
  if (trigger.getAttribute('aria-expanded') !== 'true') await user.click(trigger);
  await user.click(
    within(screen.getByRole('group', { name: `Actions for node ${node}` })).getByRole('button', {
      name: action,
    }),
  );
}

export async function premiseAction(user: User, premise: number, action: string) {
  const label = `Actions for premise ${premise}`;
  const trigger = screen.getByRole('button', { name: label });
  if (trigger.getAttribute('aria-expanded') !== 'true') await user.click(trigger);
  await user.click(
    within(screen.getByRole('group', { name: label })).getByRole('button', { name: action }),
  );
}
