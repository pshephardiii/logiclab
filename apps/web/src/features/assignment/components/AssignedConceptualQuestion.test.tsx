import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { AssignedConceptualQuestion } from './AssignedConceptualQuestion';
import { truthItem, choiceItem, optionA, optionB } from '../../../../test/conceptual-work-fixture';

test('true/false controls preserve false and clear with explicit null', async () => {
  const user = userEvent.setup();
  const onAnswer = vi.fn();
  const view = render(
    <AssignedConceptualQuestion item={truthItem} readOnly={false} onAnswer={onAnswer} />,
  );
  expect(screen.getByRole('group', { name: truthItem.content.question })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Clear answer' })).toBeDisabled();
  await user.click(screen.getByLabelText('False'));
  expect(onAnswer).toHaveBeenLastCalledWith({ type: 'true_false', answer: false });
  view.rerender(
    <AssignedConceptualQuestion
      item={truthItem}
      answer={{ type: 'true_false', answer: false }}
      readOnly={false}
      onAnswer={onAnswer}
    />,
  );
  expect(screen.getByLabelText('False')).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Clear answer' }));
  expect(onAnswer).toHaveBeenLastCalledWith({ type: 'true_false', answer: null });
});

test('choice values use stable identities after option reorder and text edit', async () => {
  const user = userEvent.setup();
  const onAnswer = vi.fn();
  render(
    <AssignedConceptualQuestion
      item={{
        ...choiceItem,
        content: {
          ...choiceItem.content,
          options: [
            { id: optionB, text: 'Updated second' },
            { id: optionA, text: 'Updated first' },
          ],
        },
      }}
      answer={{ type: 'multiple_choice', optionId: optionA }}
      readOnly={false}
      onAnswer={onAnswer}
    />,
  );
  expect(screen.getByLabelText('Updated first')).toBeChecked();
  await user.click(screen.getByLabelText('Updated second'));
  expect(onAnswer).toHaveBeenCalledWith({ type: 'multiple_choice', optionId: optionB });
});

test('feedback uses text and symbols without disclosing an answer or explanation', () => {
  const view = render(
    <AssignedConceptualQuestion
      item={truthItem}
      feedback={{ status: 'incorrect' }}
      readOnly={false}
      onAnswer={() => {}}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('✕ Incorrect');
  expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
  view.rerender(
    <AssignedConceptualQuestion
      item={truthItem}
      feedback={{ status: 'correct' }}
      readOnly={false}
      onAnswer={() => {}}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('✓ Correct');
});

test('immediate blank feedback stays neutral; manual checking can report unanswered', () => {
  const view = render(
    <AssignedConceptualQuestion
      item={truthItem}
      neutralBlanks
      feedback={{ status: 'unanswered' }}
      readOnly={false}
      onAnswer={() => {}}
    />,
  );
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  view.rerender(
    <AssignedConceptualQuestion
      item={truthItem}
      feedback={{ status: 'unanswered' }}
      readOnly={false}
      onAnswer={() => {}}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Unanswered');
});

test('authorized solutions display pinned choice text and explanation without changing entries', () => {
  render(
    <AssignedConceptualQuestion
      item={choiceItem}
      answer={{ type: 'multiple_choice', optionId: optionB }}
      solution={{
        type: 'multiple_choice',
        correctOptionId: optionA,
        explanation: 'Released explanation.',
      }}
      readOnly={false}
      onAnswer={() => {}}
    />,
  );
  expect(screen.getByLabelText('Tautology')).toBeChecked();
  expect(screen.getByText('Correct answer:')).toHaveTextContent('Contradiction');
  expect(screen.getByText('Released explanation.')).toBeInTheDocument();
});

test('final review is read-only, supports false solutions and retains plain text', async () => {
  const onAnswer = vi.fn();
  render(
    <AssignedConceptualQuestion
      item={{ ...truthItem, content: { ...truthItem.content, question: '<b>Plain text</b>' } }}
      answer={{ type: 'true_false', answer: false }}
      solution={{ type: 'true_false', correctAnswer: false, explanation: null }}
      readOnly
      onAnswer={onAnswer}
    />,
  );
  expect(screen.getByRole('group', { name: '<b>Plain text</b>' })).toBeInTheDocument();
  expect(screen.getByLabelText('False')).toBeChecked();
  expect(screen.getByLabelText('False')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Clear answer' })).not.toBeInTheDocument();
  expect(screen.getByText('Correct answer:')).toHaveTextContent('False');
  await userEvent.click(screen.getByLabelText('True'));
  expect(onAnswer).not.toHaveBeenCalled();
});
