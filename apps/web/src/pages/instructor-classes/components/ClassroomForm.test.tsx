import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ClassroomForm } from './ClassroomForm';

test('class creation retains the name on failure and clears it on success', async () => {
  const user = userEvent.setup();
  const create = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<ClassroomForm busy={false} onCreate={create} />);
  const input = screen.getByLabelText('Class name');
  await user.type(input, 'Introduction to logic');
  await user.click(screen.getByRole('button', { name: 'Create class' }));
  expect(input).toHaveValue('Introduction to logic');
  await user.click(screen.getByRole('button', { name: 'Create class' }));
  expect(input).toHaveValue('');
});
