import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ConceptualQuestionSummary } from './ConceptualQuestionSummary';
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

test('instructor summary displays the saved key and explanation', () => {
  if (problem.definition.type === 'truth_table') throw new Error('Expected conceptual fixture');
  render(<ConceptualQuestionSummary definition={problem.definition} />);
  expect(screen.getByText('Correct answer: False')).toBeInTheDocument();
  expect(screen.getByText('Explanation: A contradiction is false.')).toBeInTheDocument();
});
