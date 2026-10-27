import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { TruthTableExerciseResponse, TruthTableCheckResponse } from '@logiclab/contracts';
import { TruthTable } from './TruthTable';

test('feedback colors only answer cells and clears when feedback is removed', () => {
  const exercise: TruthTableExerciseResponse = {
    variables: ['P'],
    columns: [
      { id: 'var:v1:P', label: 'P', kind: 'given', isFinal: false },
      { id: 'expr:v1:P', label: 'P', kind: 'answer', isFinal: true },
    ],
    rows: [
      { id: 'row:v1:P=T', values: { 'var:v1:P': true } },
      { id: 'row:v1:P=F', values: { 'var:v1:P': false } },
    ],
  };
  const feedback: TruthTableCheckResponse = {
    cells: [
      { rowId: 'row:v1:P=T', columnId: 'expr:v1:P', status: 'correct' },
      { rowId: 'row:v1:P=F', columnId: 'expr:v1:P', status: 'incorrect' },
    ],
    summary: { correct: 1, incorrect: 1, unanswered: 0, total: 2 },
  };
  const props = { exercise, formula: 'P', answers: {}, onAnswer: vi.fn(), solution: null };
  const view = render(<TruthTable {...props} feedback={feedback} />);
  const inputs = screen.getAllByRole('combobox');
  expect(inputs[0]!.closest('td')).toHaveClass('answer-correct');
  expect(inputs[1]!.closest('td')).toHaveClass('answer-incorrect');
  expect(screen.getByText('Correct')).toBeInTheDocument();
  expect(screen.getByText('Incorrect')).toBeInTheDocument();
  expect(view.container.querySelectorAll('.answer-correct, .answer-incorrect')).toHaveLength(2);
  view.rerender(<TruthTable {...props} feedback={null} />);
  expect(view.container.querySelectorAll('.answer-correct, .answer-incorrect')).toHaveLength(0);
});
