import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { AnswerCell } from './AnswerCell';

test('selecting blank/T/F emits domain values with accessible feedback', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const props = { label: 'Row 1, P=T: P', value: null, feedbackId: 'feedback-1', onChange: change };
  const view = render(<AnswerCell {...props} status="incorrect" expected={false} />);
  const input = screen.getByRole('combobox', { name: props.label });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Incorrect');
  expect(screen.getByLabelText('Correct answer: F')).toBeInTheDocument();
  await user.selectOptions(input, 'T');
  expect(change).toHaveBeenLastCalledWith(true);
  await user.selectOptions(input, 'F');
  expect(change).toHaveBeenLastCalledWith(false);
  view.rerender(<AnswerCell {...props} value={true} />);
  await user.selectOptions(input, '');
  expect(change).toHaveBeenLastCalledWith(null);
  expect(input).not.toHaveAttribute('aria-describedby');
  expect(screen.queryByLabelText('Correct answer: F')).not.toBeInTheDocument();
});
