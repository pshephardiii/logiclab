import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { JoinClassForm } from './JoinClassForm';

test('failed joins preserve input and successful retries clear it', async () => {
  const user = userEvent.setup();
  const join = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<JoinClassForm busy={false} onJoin={join} />);
  const input = screen.getByLabelText('Invitation code');
  await user.type(input, 'a'.repeat(32));
  await user.click(screen.getByRole('button', { name: 'Join class' }));
  expect(input).toHaveValue('a'.repeat(32));
  await user.click(screen.getByRole('button', { name: 'Join class' }));
  expect(input).toHaveValue('');
  expect(join).toHaveBeenNthCalledWith(2, 'a'.repeat(32));
});
