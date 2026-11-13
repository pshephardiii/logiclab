import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { derivationDraft, treeDerivationDefinition } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

test.each([false, true])(
  'retained natural-deduction tree drafts stay read-only (archived: %s)',
  (archived) => {
    const problem = {
      ...derivationDraft,
      definition: treeDerivationDefinition,
      archivedAt: archived ? derivationDraft.updatedAt : null,
    };
    const before = structuredClone(problem);
    const onSave = vi.fn(),
      onDirty = vi.fn();
    render(
      <ProblemForm
        problem={problem}
        busy={false}
        onSave={onSave}
        onDirty={onDirty}
        onPreview={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('retained draft is read-only');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue to reference proof' }),
    ).not.toBeInTheDocument();
    expect(onDirty).toHaveBeenLastCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
    expect(problem).toEqual(before);
  },
);

test('retained unfinished tree references are not initialized merely by viewing the draft', () => {
  const problem = {
    ...derivationDraft,
    definition: { ...treeDerivationDefinition, referenceProof: null },
  };
  render(
    <ProblemForm
      problem={problem}
      busy={false}
      onSave={vi.fn()}
      onDirty={vi.fn()}
      onPreview={vi.fn()}
      initialAuthoringStep="reference"
    />,
  );
  expect(problem.definition.referenceProof).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add node' })).not.toBeInTheDocument();
});

test('new derivation authoring offers only Fitch and dependency', async () => {
  const user = userEvent.setup();
  render(
    <ProblemForm
      problem={null}
      busy={false}
      onSave={vi.fn()}
      onDirty={vi.fn()}
      onPreview={vi.fn()}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Problem type'), 'derivation');
  const select = screen.getByLabelText('Proof format') as HTMLSelectElement;
  expect(Array.from(select.options, (option) => option.value)).toEqual(['fitch', 'dependency']);
  select.appendChild(new Option('Injected unavailable format', 'tree'));
  await user.selectOptions(select, 'tree');
  expect(
    screen.queryByRole('button', { name: 'Change format and discard reference' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add node' })).not.toBeInTheDocument();
});
