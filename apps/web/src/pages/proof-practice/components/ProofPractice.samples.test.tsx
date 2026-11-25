import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork } from '../../../../test/unsaved-work';
import { ProofPractice } from './ProofPractice';

installDialogStub();

function load(format: 'fitch' | 'dependency') {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: format } });
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
}

test.each(['fitch', 'dependency'] as const)(
  '%s sample starts an unanswered local workspace with its exact rules',
  (format) => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected request'));
    load(format);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Change proof format')).toHaveValue(format);
    expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('P → (P ∧ Q)');
    expect(
      screen.getByRole('region', {
        name: format === 'fitch' ? 'Entered Fitch proof' : 'Entered dependency proof',
      }),
    ).toHaveTextContent('P → Q');
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('');
    const options = within(screen.getByLabelText('Rule for line 2')).getAllByRole(
      'option',
    ) as HTMLOptionElement[];
    expect(
      options
        .map((option) => option.value)
        .filter((value) => value && value !== '__assumption__')
        .sort(),
    ).toEqual(['and_introduction', 'implication_elimination', 'implication_introduction']);
    expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s sample replacement preserves pending setup on Stay and starts fresh on Discard',
  (format) => {
    renderWithUnsavedWork(<ProofPractice />);
    fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: format } });
    let field: HTMLElement;
    if (format === 'dependency') field = screen.getByLabelText('New premise');
    else {
      fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
      field = screen.getByLabelText('Premise 1');
    }
    fireEvent.change(field, { target: { value: 'R' } });
    fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'S' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(field).toHaveValue('R');
    expect(screen.getByLabelText('Conclusion')).toHaveValue('S');
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('P → (P ∧ Q)');
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s reload clears feedback and pending line/conclusion inputs only after consent',
  (format) => {
    load(format);
    fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
    expect(screen.getByRole('region', { name: 'Proof feedback' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Formula for line 2'), { target: { value: 'R' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit conclusion' }));
    fireEvent.change(screen.getByLabelText('New conclusion'), { target: { value: 'S' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('R');
    expect(screen.getByLabelText('New conclusion')).toHaveValue('S');
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('');
    expect(screen.queryByLabelText('New conclusion')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeEnabled();
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s completed example is read-only and preserves pending work and checking state',
  (format) => {
    load(format);
    fireEvent.change(screen.getByLabelText('Formula for line 2'), { target: { value: 'R' } });
    fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
    const example = screen.getByRole('region', { name: 'Completed sample example' });
    expect(within(example).getByRole('heading', { name: 'Completed example' })).toHaveFocus();
    expect(within(example).getAllByRole('row')).toHaveLength(6); // Header plus five completed lines.
    expect(within(example).queryByRole('button')).not.toBeInTheDocument();
    expect(within(example).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(example).queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('R');
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide completed example' }));
    expect(
      screen.queryByRole('region', { name: 'Completed sample example' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('R');
    fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.getByRole('region', { name: 'Completed sample example' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(
      screen.queryByRole('region', { name: 'Completed sample example' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('');
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s changing the conclusion stops advertising the old completed example',
  (format) => {
    load(format);
    fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit conclusion' }));
    expect(
      screen.queryByRole('region', { name: 'Completed sample example' }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New conclusion'), { target: { value: 'R' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply conclusion' }));
    expect(
      screen.queryByRole('button', { name: 'View completed example' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/The statement has changed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('button', { name: 'View completed example' })).toBeInTheDocument();
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s committed premise edits also invalidate the completed reference',
  (format) => {
    load(format);
    fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actions for line 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit line 1' }));
    fireEvent.change(screen.getByLabelText('Formula for line 1'), { target: { value: 'R' } });
    fireEvent.click(screen.getByRole('button', { name: 'Done editing' }));
    expect(
      screen.queryByRole('region', { name: 'Completed sample example' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View completed example' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/The statement has changed/)).toBeInTheDocument();
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s walkthrough advances the real curated proof while leaving pending work intact',
  (format) => {
    load(format);
    fireEvent.change(screen.getByLabelText('Formula for line 2'), { target: { value: 'R' } });
    fireEvent.click(screen.getByRole('button', { name: 'Walk through the solution' }));
    const walkthrough = screen.getByRole('region', { name: 'Sample walkthrough' });
    const counts = format === 'fitch' ? [1, 2, 3, 4, 4, 5] : [1, 2, 3, 4, 5];
    for (const [index, count] of counts.entries()) {
      expect(within(walkthrough).getByRole('status')).toHaveTextContent(
        `Step ${index + 1} of ${counts.length}`,
      );
      expect(within(walkthrough).getAllByRole('row')).toHaveLength(count + 1);
      expect(within(walkthrough).queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Formula for line 2')).toHaveValue('R');
      expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
      expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
      if (index < counts.length - 1)
        fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    }
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(within(walkthrough).getByRole('status')).toHaveTextContent(
      `Step ${counts.length - 1} of`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restart example' }));
    expect(within(walkthrough).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByLabelText('Formula for line 2')).toHaveValue('R');
    fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
    expect(screen.getByRole('region', { name: 'Completed sample example' })).toHaveTextContent(
      'P → (P ∧ Q)',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(
      screen.queryByRole('region', { name: 'Completed sample example' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Walk through the solution' }));
    expect(screen.getByRole('region', { name: 'Sample walkthrough' })).toHaveTextContent(
      `Step 1 of ${counts.length}`,
    );
  },
);
