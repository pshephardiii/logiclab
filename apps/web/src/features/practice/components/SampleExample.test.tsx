import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { SampleExample } from './SampleExample';

const stages = [1, 2, 3].map((number) => ({ caption: `Stage ${number}`, work: number }));

test('keyboard opening, bounded navigation, restart and direct completion announce independent stages', async () => {
  const user = userEvent.setup();
  render(
    <SampleExample
      title="Example"
      introduction="A short example."
      stages={stages}
      renderWork={(work, final) => (
        <p>
          {work} {final ? 'finished' : 'unfinished'}
        </p>
      )}
    />,
  );
  const start = screen.getByRole('button', { name: 'Walk through the solution' });
  start.focus();
  await user.keyboard('{Enter}');
  const walkthrough = screen.getByRole('region', { name: 'Sample walkthrough' });
  expect(within(walkthrough).getByRole('heading', { name: 'Sample walkthrough' })).toHaveFocus();
  expect(start).toHaveAttribute('aria-expanded', 'true');
  expect(within(walkthrough).getByRole('status')).toHaveTextContent('Step 1 of 3. Stage 1');
  expect(within(walkthrough).getByText('1 unfinished')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(within(walkthrough).getByRole('status')).toHaveTextContent('Step 2 of 3. Stage 2');
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(within(walkthrough).getByRole('status')).toHaveTextContent('Step 1 of 3. Stage 1');
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByText('3 finished')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Restart example' }));
  expect(screen.getByText('1 unfinished')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
  expect(screen.queryByRole('region', { name: 'Sample walkthrough' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Completed sample example' })).toHaveTextContent(
    '3 finished',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Walk through the solution' }));
  expect(screen.getByRole('status')).toHaveTextContent('Step 1 of 3');
  fireEvent.click(screen.getByRole('button', { name: 'Hide walkthrough' }));
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
