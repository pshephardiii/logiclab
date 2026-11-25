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
