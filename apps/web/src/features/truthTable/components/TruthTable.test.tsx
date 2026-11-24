import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { TruthTableExerciseResponse, TruthTableCheckResponse } from '@logiclab/contracts';
import { truthTableExerciseResponseSchema } from '@logiclab/contracts';
import { TruthTable } from './TruthTable';
import { generateTruthTable } from '@logiclab/logic-engine';

test.each([
  ['(P & Q) -> R', '(P ∧ Q) → R'],
  ['((P ∧ Q) → R)', '((P ∧ Q) → R)'],
  ['((P & Q))', '((P ∧ Q))'],
  ['[P & Q]', '[P ∧ Q]'],
  ['P & Q & R', 'P ∧ Q ∧ R'],
  ['(P ∧ (Q ∨ R))', '(P ∧ (Q ∨ R))'],
  ['(P ∧ Q) → (R ∨ S)', '(P ∧ Q) → (R ∨ S)'],
  ['¬(P ∧ Q)', '¬(P ∧ Q)'],
  ['P', 'P'],
])('final heading follows authored grouping in %s', (formula, expected) => {
  // The heading uses the source, rather than the engine's fully parenthesized label.
  const exercise = truthTableExerciseResponseSchema.parse(generateTruthTable(formula));
  render(
    <TruthTable
      exercise={exercise}
      formula={formula}
      answers={{}}
      onAnswer={vi.fn()}
      feedback={null}
      solution={null}
    />,
  );
  expect(
    screen.getByText(expected, { selector: '.final-column .formula-label' }),
  ).toBeInTheDocument();
});

test('final labels are simplified without changing intermediate labels, identities or answer callbacks', () => {
  const exercise = truthTableExerciseResponseSchema.parse(generateTruthTable('(P & Q) -> R'));
  const before = structuredClone(exercise);
  const onAnswer = vi.fn();
  render(
    <TruthTable
      exercise={exercise}
      formula="(P & Q) -> R"
      answers={{}}
      onAnswer={onAnswer}
      feedback={null}
      solution={null}
    />,
  );
  expect(
    screen.getByRole('columnheader', { name: /^\(P ∧ Q\) → R\s*Final answer$/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('columnheader', { name: /^\(P ∧ Q\)\s*Intermediate$/ }),
  ).toBeInTheDocument();
  const input = screen.getByRole('combobox', { name: 'Row 1, P=T, Q=T, R=T: (P ∧ Q) → R' });
  fireEvent.change(input, { target: { value: 'T' } });
  expect(onAnswer).toHaveBeenCalledWith(
    exercise.rows[0]!.id,
    exercise.columns.find((column) => column.isFinal)!.id,
    true,
  );
  expect(exercise).toEqual(before);
});

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
