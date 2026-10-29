import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { ProblemDraft } from '@logiclab/contracts';
import { ProblemForm } from './ProblemForm';
import { ConceptualProblemPreview } from './ConceptualProblemPreview';

function setup(problem: ProblemDraft | null = null) {
  const props = {
    problem,
    busy: false,
    onDirty: vi.fn(),
    onSave: vi.fn().mockResolvedValue(false),
    onPreview: vi.fn(),
  };
  const view = render(<ProblemForm {...props} />);
  return { ...view, ...props, user: userEvent.setup() };
}
const saved: ProblemDraft = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Concept',
  instructions: null,
  archivedAt: null,
  createdAt: '2026-10-29T12:00:00Z',
  updatedAt: '2026-10-29T12:00:00Z',
  definition: {
    type: 'true_false',
    definitionVersion: 1,
    question: 'Every contradiction is true.',
    correctAnswer: false,
    explanation: 'Private explanation.',
  },
};

test('authors true/false with an explicit false key and trimmed explanation', async () => {
  const { user, onSave } = setup();
  await user.type(screen.getByLabelText('Title'), 'Concept');
  await user.selectOptions(screen.getByLabelText('Problem type'), 'true_false');
  expect(screen.getByLabelText('Correct answer')).toHaveValue('');
  await user.type(screen.getByLabelText('Question'), ' A contradiction is always true. ');
  await user.selectOptions(screen.getByLabelText('Correct answer'), 'false');
  await user.type(screen.getByLabelText('Explanation (optional)'), ' Private explanation. ');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenCalledWith({
    title: 'Concept',
    instructions: null,
    definition: {
      type: 'true_false',
      definitionVersion: 1,
      question: 'A contradiction is always true.',
      correctAnswer: false,
      explanation: 'Private explanation.',
    },
  });
});

test('choice text edits and moves preserve identities; removed/re-added options get fresh IDs', async () => {
  const { user, onSave } = setup();
  await user.type(screen.getByLabelText('Title'), 'Classification');
  await user.selectOptions(screen.getByLabelText('Problem type'), 'multiple_choice');
  await user.type(screen.getByLabelText('Question'), 'Which is always false?');
  await user.type(screen.getByLabelText('Option 1', { exact: true }), 'Contradiction');
  await user.type(screen.getByLabelText('Option 2', { exact: true }), 'Tautology');
  await user.click(screen.getByLabelText('Correct option 1'));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const original = onSave.mock.calls[0]![0].definition;
  await user.click(screen.getByRole('button', { name: 'Move option 1 down' }));
  await user.type(screen.getByLabelText('Option 2', { exact: true }), ' edited');
  expect(screen.getByLabelText('Correct option 2')).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const reordered = onSave.mock.calls[1]![0].definition;
  expect(reordered.correctOptionId).toBe(original.options[0].id);
  expect(reordered.options.map((option: { id: string }) => option.id)).toEqual(
    original.options.map((option: { id: string }) => option.id).reverse(),
  );
  await user.click(screen.getByRole('button', { name: 'Add option' }));
  await user.type(screen.getByLabelText('Option 3', { exact: true }), 'Contingency');
  await user.click(screen.getByRole('button', { name: 'Remove option 2' }));
  expect(screen.getAllByRole('radio').every((input) => !(input as HTMLInputElement).checked)).toBe(
    true,
  );
  await user.click(screen.getByRole('button', { name: 'Preview draft' }));
  expect(screen.getByRole('alert')).toHaveTextContent('correctOptionId');
  await user.click(screen.getByRole('button', { name: 'Add option' }));
  await user.type(screen.getByLabelText('Option 3', { exact: true }), 'New option');
  await user.click(screen.getByLabelText('Correct option 3'));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const replacement = onSave.mock.calls[2]![0].definition;
  expect(replacement.correctOptionId).not.toBe(original.correctOptionId);
  expect(replacement.options).toHaveLength(3);
});

test('rejects duplicate option labels locally and enforces editor option bounds', async () => {
  const { user, onSave, onPreview } = setup();
  await user.selectOptions(screen.getByLabelText('Problem type'), 'multiple_choice');
  await user.type(screen.getByLabelText('Question'), 'Question');
  await user.type(screen.getByLabelText('Option 1', { exact: true }), 'Same');
  await user.type(screen.getByLabelText('Option 2', { exact: true }), ' Same ');
  await user.click(screen.getByLabelText('Correct option 1'));
  expect(screen.getByRole('button', { name: 'Remove option 1' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Preview draft' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Option text must be distinct.');
  expect(onPreview).not.toHaveBeenCalled();
  expect(onSave).not.toHaveBeenCalled();
  for (let index = 0; index < 4; index++)
    await user.click(screen.getByRole('button', { name: 'Add option' }));
  expect(screen.getByRole('button', { name: 'Add option' })).toBeDisabled();
  expect(screen.getAllByRole('radio')).toHaveLength(6);
});

test('type switching retains local fields while dirty state reflects only the current definition', async () => {
  const { user, onDirty, onPreview } = setup();
  await user.type(screen.getByLabelText('Formula'), 'P & Q');
  await user.selectOptions(screen.getByLabelText('Problem type'), 'true_false');
  await user.type(screen.getByLabelText('Question'), 'A conceptual question');
  await user.selectOptions(screen.getByLabelText('Correct answer'), 'true');
  await user.selectOptions(screen.getByLabelText('Problem type'), 'truth_table');
  expect(screen.getByLabelText('Formula')).toHaveValue('P & Q');
  await user.clear(screen.getByLabelText('Formula'));
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false));
  await user.selectOptions(screen.getByLabelText('Problem type'), 'true_false');
  expect(screen.getByLabelText('Question')).toHaveValue('A conceptual question');
  await user.click(screen.getByRole('button', { name: 'Preview draft' }));
  expect(onPreview).toHaveBeenCalledWith({
    type: 'true_false',
    definitionVersion: 1,
    question: 'A conceptual question',
    correctAnswer: true,
    explanation: null,
  });
});

test('existing conceptual edits survive failed saves and archived controls remain read-only', async () => {
  const { user, rerender, onDirty, onSave, onPreview } = setup(saved);
  expect(screen.getByLabelText('Correct answer')).toHaveValue('false');
  await user.type(screen.getByLabelText('Question'), ' Edited');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  rerender(
    <ProblemForm
      problem={saved}
      busy={false}
      saveError="Save failed"
      onDirty={onDirty}
      onSave={onSave}
      onPreview={onPreview}
    />,
  );
  expect(screen.getByLabelText('Question')).toHaveValue('Every contradiction is true. Edited');
  expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
  expect(screen.getByRole('alert')).toHaveFocus();
  rerender(
    <ProblemForm
      problem={{ ...saved, archivedAt: saved.updatedAt }}
      busy={false}
      onDirty={onDirty}
      onSave={onSave}
      onPreview={onPreview}
    />,
  );
  expect(screen.getByLabelText('Question')).toBeDisabled();
  expect(screen.getByLabelText('Problem type')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
});

test('conceptual preview is interactive and reveals the explanation only on request', async () => {
  if (saved.definition.type === 'truth_table') throw new Error('Expected conceptual fixture');
  const user = userEvent.setup();
  render(<ConceptualProblemPreview definition={saved.definition} />);
  await user.click(screen.getByLabelText('True'));
  expect(screen.queryByText('Private explanation.')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show preview answer' }));
  expect(screen.getByText('Private explanation.')).toBeInTheDocument();
  expect(screen.getByLabelText('True')).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Hide preview answer' }));
  expect(screen.queryByText('Private explanation.')).not.toBeInTheDocument();
});
