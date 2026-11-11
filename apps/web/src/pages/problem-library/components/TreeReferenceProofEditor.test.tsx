import { nodeAction, premiseAction } from '../../../../test/proof-controls';
import { installDialogStub } from '../../../../test/unsaved-work';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { CreateLibraryProblemRequest } from '@logiclab/contracts/problem-library';
import type { TreeDerivationDefinition } from '@logiclab/contracts/tree-derivation';
import { treeDerivationDefinition, derivationDraft } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

installDialogStub();

function setup(
  definition: TreeDerivationDefinition = { ...treeDerivationDefinition, referenceProof: null },
  archived = false,
) {
  const onSave = vi
    .fn<(input: CreateLibraryProblemRequest) => Promise<boolean>>()
    .mockResolvedValue(false);
  const onDirty = vi.fn();
  render(
    <ProblemForm
      initialAuthoringStep="reference"
      problem={{
        ...derivationDraft,
        definition,
        archivedAt: archived ? '2026-11-05T12:00:00.000Z' : null,
      }}
      busy={false}
      onSave={onSave}
      onDirty={onDirty}
      onPreview={vi.fn()}
    />,
  );
  return { onSave, onDirty, user: userEvent.setup() };
}

test('constructs and explicitly checks/saves an identity tree while drawing its entered branches', async () => {
  const { user, onSave, onDirty } = setup();
  await user.click(screen.getByRole('button', { name: 'Start reference proof' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P → P');
  await user.selectOptions(screen.getByLabelText('Rule for node 1'), 'implication_introduction');
  await nodeAction(user, 1, 'New branch assumption for node 1');
  await user.type(screen.getByLabelText('Formula for node 2'), 'P');
  await user.type(screen.getByLabelText('Branch assumption formula'), 'P');
  expect(screen.getByRole('checkbox', { name: /Discharge node 2:/ })).not.toBeChecked();
  await user.click(screen.getByRole('checkbox', { name: /Discharge node 2:/ }));
  await user.click(screen.getByRole('button', { name: 'Add node' }));
  await user.click(screen.getByRole('button', { name: 'Edit node 1' }));
  const choice = within(screen.getByLabelText('Node 1 branch 1 root')).getByRole('option', {
    name: /2\. P/,
  }) as HTMLOptionElement;
  expect(screen.getByLabelText('Node 1 branch 1 root')).toHaveValue(choice.value);
  expect(
    within(screen.getByRole('region', { name: 'Tree preview' })).getByText('[P]'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Current reference accepted');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const value = onSave.mock.calls[0]![0].definition;
  if (value.type !== 'derivation' || value.format !== 'tree') throw Error();
  expect(value.referenceProof!.nodes).toHaveLength(2);
  expect(value.referenceProof!.nodes[0]).toMatchObject({
    branches: [{ rootId: choice.value, assumptionFormula: 'P', assumptionIds: [choice.value] }],
  });
  await user.click(screen.getByRole('button', { name: 'Edit node 2' }));
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P');
  expect(onDirty).toHaveBeenLastCalledWith(true);
  await user.clear(screen.getByLabelText('Formula for node 2'));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('premise copying is explicit and statement edits never rewrite entered node formulas', async () => {
  const definition: TreeDerivationDefinition = {
    ...treeDerivationDefinition,
    conclusion: 'P',
    premises: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', formula: 'P' }],
    rules: [],
    referenceProof: null,
  };
  const { user, onSave } = setup(definition);
  await user.click(screen.getByRole('button', { name: 'Start reference proof' }));
  await user.click(screen.getByRole('button', { name: 'New premise node' }));
  await user.selectOptions(
    screen.getByLabelText('Statement premise for node 2'),
    definition.premises[0]!.id,
  );
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: 'Copy statement premise to node 2' }));
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P');
  await user.click(screen.getByRole('button', { name: 'Add node' }));
  await user.click(screen.getByRole('button', { name: '1. Problem details' }));
  await premiseAction(user, 1, 'Edit premise 1');
  await user.type(screen.getByLabelText('Premise 1'), ' & Q');
  await user.click(screen.getByRole('button', { name: 'Update premise' }));
  await user.click(screen.getByRole('button', { name: '2. Reference proof' }));
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P');
  expect(screen.getByRole('region', { name: 'Reference statement mismatch' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenCalledOnce();
});

test('confirmed node deletion retains missing child and assumption identities for explicit repair', async () => {
  const { user, onSave } = setup(treeDerivationDefinition);
  await user.click(screen.getByRole('button', { name: 'Edit node 1' }));
  await nodeAction(user, 1, 'Delete node 1');
  await user.click(screen.getByRole('button', { name: 'Keep proof' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P');
  await user.click(screen.getByRole('button', { name: 'Edit node 1' }));
  await nodeAction(user, 1, 'Delete node 1');
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  const root = screen.getByLabelText('Node 1 branch 1 root');
  expect(within(root).getByRole('option', { name: /Missing or unavailable/ })).toBeInTheDocument();
  expect(screen.getByText('Missing assumption occurrence')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const value = onSave.mock.calls[0]![0].definition;
  if (value.type !== 'derivation' || value.format !== 'tree') throw Error();
  expect(value.referenceProof!.nodes).toEqual([treeDerivationDefinition.referenceProof!.nodes[1]]);
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('needs correction');
  await user.click(
    screen.getByRole('button', { name: 'Remove unavailable assumption 1 from node 1 branch 1' }),
  );
  expect(screen.queryByText('Missing assumption occurrence')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Remove reference proof' }));
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(screen.getByRole('button', { name: 'Start reference proof' })).toBeInTheDocument();
});

test('rule changes retain existing branch work and removed rule selections stay visible', async () => {
  const { user, onSave } = setup(treeDerivationDefinition);
  await user.click(screen.getByRole('button', { name: '1. Problem details' }));
  await user.click(screen.getByRole('button', { name: 'Permitted rules (1 selected)' }));
  await screen.findByRole('dialog', { name: 'Permitted rules' });
  await user.click(screen.getByRole('checkbox', { name: 'Implication introduction' }));
  await user.click(screen.getByRole('button', { name: 'Done' }));
  await user.click(screen.getByRole('button', { name: '2. Reference proof' }));
  expect(
    within(screen.getByLabelText('Rule for node 2')).getByRole('option', {
      name: /Missing or unavailable/,
    }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Node 2 branch 1 assumption formula')).toHaveValue('P');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[0]![0].definition).toMatchObject({
    rules: [],
    referenceProof: treeDerivationDefinition.referenceProof,
  });
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('needs correction');
});

test('archived tree drafts disable editor changes', () => {
  setup(treeDerivationDefinition, true);
  expect(screen.getByLabelText('Formula for node 2')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Edit node 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'New assumption node' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove reference proof' })).toBeDisabled();
});

test('tree format is selectable and cancelled switches retain the reference', async () => {
  const { user } = setup();
  await user.click(screen.getByRole('button', { name: '1. Problem details' }));
  await user.selectOptions(screen.getByLabelText('Proof format'), 'dependency');
  await user.selectOptions(screen.getByLabelText('Proof format'), 'tree');
  await user.click(screen.getByRole('button', { name: 'Continue to reference proof' }));
  await user.click(screen.getByRole('button', { name: '1. Problem details' }));
  await user.selectOptions(screen.getByLabelText('Proof format'), 'fitch');
  await user.click(screen.getByRole('button', { name: 'Keep current format' }));
  await user.click(screen.getByRole('button', { name: '2. Reference proof' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P → P');
});

test('pending reference nodes gate check/save/preview and format replacement without omitting entries', async () => {
  const { user, onSave } = setup();
  await user.click(screen.getByRole('button', { name: 'Start reference proof' }));
  await user.click(screen.getByRole('button', { name: 'New assumption node' }));
  await user.type(screen.getByLabelText('Formula for node 2'), 'P &');
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Preview draft' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check current proof' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '1. Problem details' })).toBeDisabled();
  expect(onSave).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const original = onSave.mock.lastCall![0].definition;
  if (original.type !== 'derivation' || original.format !== 'tree')
    throw new Error('Expected tree');
  expect(original.referenceProof!.nodes).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'New assumption node' }));
  await user.type(screen.getByLabelText('Formula for node 2'), 'P &');
  await user.click(screen.getByRole('button', { name: 'Add node' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const confirmed = onSave.mock.lastCall![0].definition;
  if (confirmed.type !== 'derivation' || confirmed.format !== 'tree')
    throw new Error('Expected tree');
  expect(confirmed.referenceProof!.nodes).toHaveLength(2);
  expect(confirmed.referenceProof!.nodes[1]!.formula).toBe('P ∧');
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P ∧');
});
