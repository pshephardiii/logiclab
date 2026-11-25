import type { ReactNode } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork } from '../../../test/unsaved-work';
import { TruthTreePracticePage } from './TruthTreePracticePage';

vi.mock('../../components/layout/Page', () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
installDialogStub();

test('tree sample loads initial sources without expansions, a verdict or automatic checking', () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected request'));
  renderWithUnsavedWork(<TruthTreePracticePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Truth-tree statement' })).toHaveTextContent('P → Q');
  expect(screen.getByRole('region', { name: 'Truth tree' })).toHaveTextContent('¬Q');
  expect(screen.getAllByRole('button', { name: /^Add step to branch/ })).toHaveLength(1);
  expect(screen.getByRole('radio', { name: 'Valid' })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: 'Invalid' })).not.toBeChecked();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});

test('pending setup survives Stay and is discarded before sample creation', () => {
  renderWithUnsavedWork(<TruthTreePracticePage />);
  fireEvent.change(screen.getByLabelText('New premise'), { target: { value: 'R' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('New premise')).toHaveValue('R');
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.getByRole('button', { name: 'Check tree' })).toBeEnabled();
  expect(screen.queryByLabelText('New premise')).not.toBeInTheDocument();
});

test('reload clears tree feedback, verdict and pending construction only on Discard', () => {
  renderWithUnsavedWork(<TruthTreePracticePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Invalid' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Source formula')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Invalid' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.queryByLabelText('Source formula')).not.toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Invalid' })).not.toBeChecked();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check tree' })).toBeEnabled();
});

test.each(['valid', 'invalid'] as const)(
  '%s completed tree shows its verdict separately without answering or changing the attempt',
  (verdict) => {
    renderWithUnsavedWork(<TruthTreePracticePage />);
    fireEvent.click(
      screen.getByRole('button', {
        name: verdict === 'valid' ? 'Load sample problem' : 'Load invalid-argument sample',
      }),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Invalid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
    const source = screen.getByLabelText('Source formula');
    const choice = within(source).getAllByRole('option')[1] as HTMLOptionElement;
    fireEvent.change(source, { target: { value: choice.value } });
    expect(screen.getByRole('button', { name: 'Check tree' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
    const example = screen.getByRole('region', { name: 'Completed sample example' });
    expect(example).toHaveTextContent(`Sample argument: ${verdict}.`);
    if (verdict === 'invalid') expect(example).toHaveTextContent('P and Q can both be false');
    expect(
      screen.getByRole('region', { name: 'Completed example truth tree' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Source formula')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Invalid' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Check tree' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
    expect(within(example).queryByRole('button')).not.toBeInTheDocument();
    expect(within(example).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide completed example' }));
    expect(screen.getByLabelText('Source formula')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Invalid' })).toBeChecked();
  },
);

test('switching tree samples requires consent, closes the old example and leaves the new verdict unanswered', () => {
  renderWithUnsavedWork(<TruthTreePracticePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
  fireEvent.click(screen.getByRole('button', { name: 'Load invalid-argument sample' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByRole('region', { name: 'Completed sample example' })).toHaveTextContent(
    'Sample argument: valid.',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load invalid-argument sample' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(
    screen.queryByRole('region', { name: 'Completed sample example' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Valid' })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: 'Invalid' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
  expect(screen.getByRole('region', { name: 'Completed sample example' })).toHaveTextContent(
    'Sample argument: invalid.',
  );
});

test.each(['valid', 'invalid'] as const)(
  '%s tree walkthrough keeps the sample verdict for its final stage and preserves the visitor choice',
  (verdict) => {
    renderWithUnsavedWork(<TruthTreePracticePage />);
    fireEvent.click(
      screen.getByRole('button', {
        name: verdict === 'valid' ? 'Load sample problem' : 'Load invalid-argument sample',
      }),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Invalid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Walk through the solution' }));
    const walkthrough = screen.getByRole('region', { name: 'Sample walkthrough' });
    for (let index = 0; index < 4; index++) {
      expect(within(walkthrough).getByRole('status')).toHaveTextContent(`Step ${index + 1} of 4`);
      expect(screen.getByRole('radio', { name: 'Invalid' })).toBeChecked();
      expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
      if (index < 3) {
        expect(within(walkthrough).queryByText(/Sample argument:/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
      }
    }
    expect(walkthrough).toHaveTextContent(`Sample argument: ${verdict}.`);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(within(walkthrough).queryByText(/Sample argument:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restart example' }));
    expect(walkthrough).toHaveTextContent('Step 1 of 4');
    expect(screen.getByRole('radio', { name: 'Invalid' })).toBeChecked();
  },
);
