import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { CreateLibraryProblemRequest } from '@logiclab/contracts/problem-library';
import type { TreeDerivationDefinition } from '@logiclab/contracts/tree-derivation';
import { treeDerivationDefinition, derivationDraft } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

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
  await user.click(screen.getByRole('button', { name: 'Add assumption node' }));
  await user.type(screen.getByLabelText('Formula for node 2'), 'P');
  const choice = within(screen.getByLabelText('Node 1 branch 1 root')).getByRole('option', {
    name: /2\. P/,
  }) as HTMLOptionElement;
  await user.selectOptions(screen.getByLabelText('Node 1 branch 1 root'), choice.value);
  await user.type(screen.getByLabelText('Node 1 branch 1 assumption formula'), 'P');
  await user.click(screen.getByRole('checkbox', { name: /Discharge node 2/ }));
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
  await user.click(screen.getByRole('button', { name: 'Add premise node' }));
  await user.selectOptions(
    screen.getByLabelText('Statement premise for node 2'),
    definition.premises[0]!.id,
  );
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: 'Copy statement premise to node 2' }));
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P');
  await user.type(screen.getByLabelText('Premise 1'), ' & Q');
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenCalledOnce();
});

test('confirmed node deletion retains missing child and assumption identities for explicit repair', async () => {
  const { user, onSave } = setup(treeDerivationDefinition);
  await user.click(screen.getByRole('button', { name: 'Delete node 1' }));
  await user.click(screen.getByRole('button', { name: 'Keep proof' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P');
  await user.click(screen.getByRole('button', { name: 'Delete node 1' }));
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
  await user.click(screen.getByRole('checkbox', { name: 'Allow Implication introduction' }));
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
  expect(screen.getByLabelText('Formula for node 1')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add assumption node' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove reference proof' })).toBeDisabled();
});

test('tree format is selectable for a new reference and cancelled switches retain work', async () => {
  const { user } = setup();
  await user.selectOptions(screen.getByLabelText('Proof format'), 'dependency');
  await user.selectOptions(screen.getByLabelText('Proof format'), 'tree');
  await user.click(screen.getByRole('button', { name: 'Start reference proof' }));
  await user.selectOptions(screen.getByLabelText('Proof format'), 'fitch');
  await user.click(screen.getByRole('button', { name: 'Keep current format' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P → P');
});
