import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { AccountForm } from './AccountForm';

test('password clears after a settled login while email remains', async () => {
  const user = userEvent.setup();
  let settle!: () => void;
  const submit = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
  );
  render(
    <AccountForm
      view="login"
      email="person@example.com"
      busy={false}
      onSubmit={submit}
      onResend={vi.fn()}
    />,
  );
  await user.type(screen.getByLabelText('Password'), 'Secret-password1!');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(submit).toHaveBeenCalledWith({
    email: 'person@example.com',
    password: 'Secret-password1!',
  });
  expect(screen.getByLabelText('Password')).toHaveValue('Secret-password1!');
  await act(async () => {
    settle();
  });
  expect(screen.getByLabelText('Password')).toHaveValue('');
  expect(screen.getByLabelText('Email')).toHaveValue('person@example.com');
});
