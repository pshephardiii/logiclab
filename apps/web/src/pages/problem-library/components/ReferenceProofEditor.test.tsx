import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { CreateLibraryProblemRequest } from '@logiclab/contracts/problem-library';
import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import type { FitchProof } from '@logiclab/contracts';
import { derivationDefinition, derivationDraft } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

function setup(definition = derivationDefinition) {
  const onSave = vi
    .fn<(input: CreateLibraryProblemRequest) => Promise<boolean>>()
    .mockResolvedValue(false);
  render(
    <ProblemForm
      problem={{ ...derivationDraft, definition }}
      busy={false}
      onSave={onSave}
      onPreview={vi.fn()}
      onDirty={vi.fn()}
    />,
  );
  return { user: userEvent.setup(), onSave };
}
async function conditionalProof() {
  const view = setup();
  const { user } = view;
  await user.click(screen.getByRole('button', { name: 'Start reference proof' }));
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 1'), 'P');
  const scope = screen.getByLabelText('New line scope') as HTMLSelectElement;
  const block = scope.value;
  const endpoint = screen.getByLabelText('Final line of Subproof 1 at line 1') as HTMLSelectElement;
  await user.selectOptions(endpoint, endpoint.options[1]!.value);
  await user.selectOptions(scope, '');
  await user.click(screen.getByRole('button', { name: 'Add inference line' }));
  await user.type(screen.getByLabelText('Formula for line 2'), 'P -> P');
  await user.selectOptions(screen.getByLabelText('Rule for line 2'), 'implication_introduction');
  await user.selectOptions(screen.getByLabelText('Line 2 subproof 1'), block);
  return { ...view, block };
}

test('authors, locally checks and saves a valid single-assumption conditional proof without auto-saving', async () => {
  const { user, onSave } = await conditionalProof();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Current reference accepted');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const definition = onSave.mock.calls[0]![0].definition;
  if (definition.type !== 'derivation') throw new Error('Expected derivation');
  expect(definition.referenceProof!.steps).toHaveLength(2);
  expect(definition.referenceProof!.blocks[0]!.endId).toBe(definition.referenceProof!.steps[0]!.id);
  await user.type(screen.getByLabelText('Formula for line 2'), ' &');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('needs correction');
  expect(screen.getByText(/Line 2:/)).toBeInTheDocument();
});

test('line insertion/deletion preserve selected citation IDs and expose missing targets', async () => {
  const p = crypto.randomUUID();
  const implication = crypto.randomUUID();
  const { user, onSave } = setup({
    ...derivationDefinition,
    premises: [
      { id: p, formula: 'P' },
      { id: implication, formula: 'P -> Q' },
    ],
    conclusion: 'Q',
    rules: [{ id: 'implication_elimination', label: 'MP' }],
  });
  await user.click(screen.getByRole('button', { name: 'Start reference proof' }));
  await user.click(screen.getByRole('button', { name: 'Add inference line' }));
  await user.type(screen.getByLabelText('Formula for line 3'), 'Q');
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'implication_elimination');
  const first = screen.getByLabelText('Line 3 citation 1') as HTMLSelectElement;
  const ids = Array.from(first.options)
    .slice(1)
    .map((option) => option.value);
  await user.selectOptions(first, ids[0]!);
  await user.selectOptions(screen.getByLabelText('Line 3 citation 2'), ids[1]!);
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('accepted');
  await user.selectOptions(screen.getByLabelText('Insert before'), ids[0]!);
  await user.click(screen.getByRole('button', { name: 'Add premise line at root' }));
  expect(screen.getByLabelText('Line 4 citation 1')).toHaveValue(ids[0]);
  expect(screen.getByLabelText('Line 4 citation 2')).toHaveValue(ids[1]);
  await user.click(screen.getByRole('button', { name: 'Delete line 2' }));
  await user.click(screen.getByRole('button', { name: 'Keep reference work' }));
  expect(screen.getByLabelText('Formula for line 4')).toHaveValue('Q');
  await user.click(screen.getByRole('button', { name: 'Delete line 2' }));
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(screen.getByLabelText('Line 3 citation 1')).toHaveValue(ids[0]);
  expect(
    within(screen.getByLabelText('Line 3 citation 1')).getByRole('option', {
      name: /Missing or unavailable/,
    }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const value = onSave.mock.calls[0]![0].definition;
  if (value.type !== 'derivation') throw new Error('Expected derivation');
  expect(value.referenceProof!.steps[2]).toMatchObject({ lineReferences: ids });
});

test('subproof deletion is explicit, removes its lines and leaves surviving subproof citations unresolved', async () => {
  const { user, block } = await conditionalProof();
  await user.click(screen.getByRole('button', { name: 'Delete Subproof 1 at line 1' }));
  expect(screen.getByRole('group', { name: 'Confirm reference deletion' })).toHaveTextContent(
    'Delete 1 reference line',
  );
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P -> P');
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P -> P');
  expect(screen.getByLabelText('Line 1 subproof 1')).toHaveValue(block);
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('needs correction');
});

test('missing references and ambiguous identities are inspectable without silent repair', async () => {
  const id = crypto.randomUUID();
  const proof: FitchProof = {
    proofVersion: 1,
    format: 'fitch',
    blocks: [],
    steps: [
      { kind: 'premise', id, blockId: null, formula: 'P', premiseId: null },
      { kind: 'premise', id, blockId: null, formula: 'Q', premiseId: null },
    ],
  };
  const { user, onSave } = setup({ ...derivationDefinition, referenceProof: proof });
  expect(screen.getByRole('alert')).toHaveTextContent('duplicate or colliding identities');
  expect(screen.queryByRole('button', { name: 'Add inference line' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[0]![0].definition).toMatchObject({ referenceProof: proof });
  await user.click(screen.getByRole('button', { name: 'Remove reference proof' }));
  expect(screen.queryByRole('button', { name: 'Start reference proof' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(screen.getByRole('button', { name: 'Start reference proof' })).toBeInTheDocument();
});

test('checks unsupported/incomplete statements explicitly and preserves blank reference work', async () => {
  const definition: DerivationDefinition = {
    ...derivationDefinition,
    conclusion: '',
    referenceProof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
  };
  const { user, onSave } = setup(definition);
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('could not be fully assessed');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[0]![0].definition).toEqual(definition);
});
