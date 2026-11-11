import { installDialogStub } from '../../../../test/unsaved-work';
import { lineAction } from '../../../../test/proof-controls';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type {
  CreateLibraryProblemRequest,
  LibraryProblemDraft,
} from '@logiclab/contracts/problem-library';
import { derivationDraft, derivationDefinition } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

installDialogStub();

async function openRules(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Permitted rules \(/ }));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
}

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
  await openRules(user);
  expect(screen.getAllByRole('checkbox').every((box) => !(box as HTMLInputElement).checked)).toBe(
    true,
  );
  await user.click(screen.getByRole('button', { name: 'Done' }));
  await user.type(screen.getByLabelText('New premise'), 'P &');
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenCalledOnce();
  const value = onSave.mock.calls[0]![0];
  expect(value.definition).toMatchObject({
    type: 'derivation',
    format: 'fitch',
    conclusion: '',
    premises: [{ id: expect.any(String), formula: 'P ∧' }],
    rules: [],
    referenceProof: null,
  });
  expect(screen.getByRole('region', { name: 'Problem premise diagram' })).toHaveTextContent('P ∧');
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
  await lineAction(user, 1, 'Move line 1 down');
  await lineAction(user, 2, 'Edit line 2');
  await user.type(screen.getByLabelText('Premise 2'), ' & Q');
  await user.click(screen.getByRole('button', { name: 'Update premise' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const value = onSave.mock.calls[0]![0].definition;
  expect(value).toMatchObject({
    premises: [
      { id: second, formula: 'Q' },
      { id: first, formula: 'P ∧ Q' },
    ],
    referenceProof: reference,
  });
  expect(definition.premises[0]!.formula).toBe('P');
  await lineAction(user, 2, 'Delete line 2');
  await user.click(screen.getByRole('button', { name: 'Delete premise' }));
  await user.type(screen.getByLabelText('New premise'), 'P');
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const latest = onSave.mock.calls.at(-1)![0].definition;
  if (latest.type !== 'derivation') throw new Error('Expected derivation');
  expect(latest.premises[1]!.id).not.toBe(first);
  expect(latest.referenceProof).toEqual(reference);
});

test('rule labels use stable rule IDs, reject normalized collisions and survive disable/re-enable', async () => {
  const { user, onSave } = setup(derivationDraft);
  await openRules(user);
  await user.click(screen.getByRole('checkbox', { name: 'Implication elimination' }));
  await user.clear(screen.getByLabelText('Label for Implication elimination'));
  await user.type(screen.getByLabelText('Label for Implication elimination'), 'MP');
  await user.click(screen.getByRole('checkbox', { name: 'Conjunction elimination' }));
  await user.clear(screen.getByLabelText('Label for Conjunction elimination'));
  await user.type(screen.getByLabelText('Label for Conjunction elimination'), ' mp ');
  await user.click(screen.getByRole('button', { name: 'Done' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('distinct normalized labels');
  expect(screen.getByRole('alert')).toHaveFocus();
  await openRules(user);
  await user.click(screen.getByRole('checkbox', { name: 'Conjunction elimination' }));
  await user.click(screen.getByRole('checkbox', { name: 'Implication elimination' }));
  expect(screen.queryByLabelText('Label for Implication elimination')).not.toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: 'Implication elimination' }));
  expect(screen.getByLabelText('Label for Implication elimination')).toHaveValue('MP');
  await user.click(screen.getByRole('button', { name: 'Done' }));
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
  expect(screen.getByLabelText('Conclusion')).toHaveValue('¬P → Q');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[1]![0].definition).toMatchObject({
    type: 'derivation',
    conclusion: '¬P → Q',
    rules: derivationDefinition.rules,
  });
});

test('reverting statement and permission edits clears dirty state without counting inactive label cache', async () => {
  const { user, onDirty } = setup(derivationDraft);
  await user.type(screen.getByLabelText('New premise'), 'P');
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true));
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await lineAction(user, 1, 'Delete line 1');
  await user.click(screen.getByRole('button', { name: 'Delete premise' }));
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false));
  await openRules(user);
  await user.click(screen.getByRole('checkbox', { name: 'Implication elimination' }));
  const label = screen.getByLabelText('Label for Implication elimination');
  await user.clear(label);
  await user.type(label, 'My label');
  await user.click(screen.getByRole('checkbox', { name: 'Implication elimination' }));
  await user.click(screen.getByRole('button', { name: 'Done' }));
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
  expect(
    screen.getByRole('region', { name: 'Problem premise diagram' }).querySelectorAll('tbody tr'),
  ).toHaveLength(50);
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
  expect(screen.getByRole('button', { name: /Permitted rules \(/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add premise' })).toBeDisabled();
});

test('saved dependency drafts open in their own editor without mutation', () => {
  const saved: LibraryProblemDraft = {
    ...derivationDraft,
    definition: { ...derivationDefinition, format: 'dependency', referenceProof: null },
  };
  const before = structuredClone(saved);
  const { onSave, onPreview } = setup(saved);
  expect(screen.getByLabelText('Proof format')).toHaveValue('dependency');
  expect(screen.getByRole('button', { name: 'Continue to reference proof' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Open subproof' })).not.toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  expect(onPreview).not.toHaveBeenCalled();
  expect(saved).toEqual(before);
});
