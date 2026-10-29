import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ProblemForm } from './ProblemForm';
import type { ProblemDraft } from '@logiclab/contracts';

const problem: ProblemDraft = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Conceptual snapshot',
  instructions: null,
  archivedAt: null,
  createdAt: '2026-10-29T12:00:00Z',
  updatedAt: '2026-10-29T12:00:00Z',
  definition: {
    type: 'true_false',
    definitionVersion: 1,
    question: 'Every contradiction is true.',
    correctAnswer: false,
    explanation: 'A contradiction is false.',
  },
};

test('instructor read view shows the saved conceptual key without a formula editor that could replace it', () => {
  const onSave = vi.fn();
  render(
    <ProblemForm
      problem={problem}
      busy={false}
      onDirty={vi.fn()}
      onSave={onSave}
      onPreview={vi.fn()}
    />,
  );
  expect(screen.getByText('Correct answer: False')).toBeInTheDocument();
  expect(screen.getByText('Explanation: A contradiction is false.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Formula')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});
