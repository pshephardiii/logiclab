import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type {
  CreateLibraryProblemRequest,
  LibraryProblemDraft,
} from '@logiclab/contracts/problem-library';
import { derivationDraft, derivationDefinition } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

function setup(problem: LibraryProblemDraft | null = null) {
  const props = {
    problem,
    busy: false,
    onDirty: vi.fn(),
    onSave: vi
      .fn<(input: CreateLibraryProblemRequest) => Promise<boolean>>()
      .mockResolvedValue(false),
    onPreview: vi.fn(),
  };
  const view = render(<ProblemForm {...props} />);
  return { ...props, ...view, user: userEvent.setup() };
}

test('creates and retains an incomplete Fitch draft without default rule permissions or fabricated reference', async () => {
  const { user, onSave, onDirty, onPreview } = setup();
  await user.type(screen.getByLabelText('Title'), 'First proof');
  await user.selectOptions(screen.getByLabelText('Problem type'), 'derivation');
  expect(screen.getAllByRole('checkbox').every((box) => !(box as HTMLInputElement).checked)).toBe(
    true,
  );
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.type(screen.getByLabelText('Premise 1'), 'P &');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenCalledOnce();
  const value = onSave.mock.calls[0]![0];
  expect(value.definition).toMatchObject({
    type: 'derivation',
    format: 'fitch',
    conclusion: '',
    premises: [{ id: expect.any(String), formula: 'P &' }],
    rules: [],
    referenceProof: null,
  });
  expect(screen.getByLabelText('Premise 1')).toHaveValue('P &');
  expect(onDirty).toHaveBeenLastCalledWith(true);
  await user.click(screen.getByRole('button', { name: 'Preview draft' }));
  expect(onPreview).toHaveBeenCalledWith(value.definition);
});

test('premise edits/reorders preserve identity and reference citations; re-added premises get fresh IDs', async () => {
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const reference = {
    proofVersion: 1 as const,
    format: 'fitch' as const,
    steps: [
      {
        kind: 'premise' as const,
        id: '33333333-3333-4333-8333-333333333333',
        blockId: null,
        formula: 'P',
        premiseId: first,
      },
    ],
    blocks: [],
  };
  const definition = {
    ...derivationDefinition,
    premises: [
      { id: first, formula: 'P' },
      { id: second, formula: 'Q' },
    ],
    referenceProof: reference,
  };
  const { user, onSave } = setup({ ...derivationDraft, definition });
  await user.click(screen.getByRole('button', { name: 'Move premise 1 down' }));
  await user.type(screen.getByLabelText('Premise 2'), ' & Q');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const value = onSave.mock.calls[0]![0].definition;
  expect(value).toMatchObject({
    premises: [
      { id: second, formula: 'Q' },
      { id: first, formula: 'P & Q' },
    ],
    referenceProof: reference,
  });
  expect(definition.premises[0]!.formula).toBe('P');
  await user.click(screen.getByRole('button', { name: 'Remove premise 2' }));
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const latest = onSave.mock.calls.at(-1)![0].definition;
  if (latest.type !== 'derivation') throw new Error('Expected derivation');
  expect(latest.premises[1]!.id).not.toBe(first);
  expect(latest.referenceProof).toEqual(reference);
});

test('rule labels use stable rule IDs, reject normalized collisions and survive disable/re-enable', async () => {
  const { user, onSave } = setup(derivationDraft);
  await user.click(screen.getByLabelText('Allow Implication elimination'));
  const mp = screen.getByLabelText('Label for Implication elimination');
  await user.clear(mp);
  await user.type(mp, 'MP');
  await user.click(screen.getByLabelText('Allow Conjunction elimination'));
  const other = screen.getByLabelText('Label for Conjunction elimination');
  await user.clear(other);
  await user.type(other, ' mp ');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('distinct normalized labels');
  expect(screen.getByRole('alert')).toHaveFocus();
  await user.click(screen.getByLabelText('Allow Conjunction elimination'));
  await user.click(screen.getByLabelText('Allow Implication elimination'));
  expect(mp).toBeDisabled();
  await user.click(screen.getByLabelText('Allow Implication elimination'));
  expect(mp).toHaveValue('MP');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[0]![0].definition).toMatchObject({
    rules: [
      { id: 'implication_introduction', label: 'Conditional proof' },
      { id: 'implication_elimination', label: 'MP' },
    ],
  });
});

test('type switches retain derivation fields while only the selected type is saved', async () => {
  const { user, onSave } = setup(derivationDraft);
  await user.clear(screen.getByLabelText('Conclusion'));
  await user.type(screen.getByLabelText('Conclusion'), '~P -> Q');
  await user.selectOptions(screen.getByLabelText('Problem type'), 'truth_table');
  await user.type(screen.getByLabelText('Formula'), 'P');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[0]![0].definition).toEqual({
    type: 'truth_table',
    definitionVersion: 1,
    formula: 'P',
  });
  await user.selectOptions(screen.getByLabelText('Problem type'), 'derivation');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('~P -> Q');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[1]![0].definition).toMatchObject({
    type: 'derivation',
    conclusion: '~P -> Q',
    rules: derivationDefinition.rules,
  });
});

test('reverting statement and permission edits clears dirty state without counting inactive label cache', async () => {
  const { user, onDirty } = setup(derivationDraft);
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true));
  await user.click(screen.getByRole('button', { name: 'Remove premise 1' }));
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false));
  await user.click(screen.getByLabelText('Allow Implication elimination'));
  const label = screen.getByLabelText('Label for Implication elimination');
  await user.clear(label);
  await user.type(label, 'My label');
  await user.click(screen.getByLabelText('Allow Implication elimination'));
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false));
});

test('premise bounds and archived locks prevent further authoring without truncating saved data', () => {
  const premises = Array.from({ length: 50 }, () => ({
    id: crypto.randomUUID(),
    formula: `P`,
  }));
  const problem = { ...derivationDraft, definition: { ...derivationDefinition, premises } };
  const view = setup(problem);
  expect(screen.getByRole('button', { name: 'Add premise' })).toBeDisabled();
  expect(screen.getByLabelText('Premise 50')).toBeInTheDocument();
  view.rerender(
    <ProblemForm
      problem={{ ...problem, archivedAt: derivationDraft.updatedAt }}
      busy={false}
      onDirty={view.onDirty}
      onSave={view.onSave}
      onPreview={view.onPreview}
    />,
  );
  expect(screen.getByLabelText('Conclusion')).toBeDisabled();
  expect(screen.getByLabelText('Problem type')).toBeDisabled();
  expect(screen.getByLabelText('Allow Reiteration')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add premise' })).toBeDisabled();
});
