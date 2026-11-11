import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { CreateLibraryProblemRequest } from '@logiclab/contracts/problem-library';
import { installDialogStub } from '../../../../test/unsaved-work';
import { premiseAction } from '../../../../test/proof-controls';
import { derivationDraft, treeDerivationDefinition } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

installDialogStub();

function setup(archived = false, reference = false) {
  const onSave = vi
    .fn<(input: CreateLibraryProblemRequest) => Promise<boolean>>()
    .mockResolvedValue(false);
  const onDirty = vi.fn();
  render(
    <ProblemForm
      problem={{
        ...derivationDraft,
        definition: {
          ...treeDerivationDefinition,
          referenceProof: reference ? treeDerivationDefinition.referenceProof : null,
        },
        archivedAt: archived ? derivationDraft.updatedAt : null,
      }}
      busy={false}
      onSave={onSave}
      onDirty={onDirty}
      onPreview={vi.fn()}
    />,
  );
  return { user: userEvent.setup(), onSave, onDirty };
}

function savedDefinition(save: ReturnType<typeof setup>['onSave']) {
  const definition = save.mock.lastCall![0].definition;
  if (definition.type !== 'derivation' || definition.format !== 'tree')
    throw new Error('Expected tree');
  return definition;
}

test('confirmed statement sources retain identities through edits and ordering; reference starts with only an unverified conclusion root', async () => {
  const { user, onSave } = setup();
  expect(screen.getByRole('navigation', { name: 'Tree authoring steps' })).toBeInTheDocument();
  await user.type(screen.getByLabelText('New premise'), 'P');
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '2. Reference proof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.type(screen.getByLabelText('New premise'), 'Q');
  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const sources = savedDefinition(onSave).premises;
  await premiseAction(user, 2, 'Move premise 2 up');
  await premiseAction(user, 1, 'Edit premise 1');
  await user.clear(screen.getByLabelText('Premise 1'));
  await user.type(screen.getByLabelText('Premise 1'), 'R');
  await user.click(screen.getByRole('button', { name: 'Update premise' }));
  await premiseAction(user, 2, 'Delete premise 2');
  await user.click(screen.getByRole('button', { name: 'Keep premise' }));
  await user.click(screen.getByRole('button', { name: 'Continue to reference proof' }));
  expect(screen.getByLabelText('Title')).not.toBeVisible();
  expect(screen.getByLabelText('New premise')).not.toBeVisible();
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P → P');
  expect(screen.queryByLabelText('Formula for node 2')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const saved = savedDefinition(onSave);
  expect(saved.premises).toEqual([{ ...sources[1]!, formula: 'R' }, sources[0]]);
  expect(saved.referenceProof!.nodes).toHaveLength(1);
  expect(saved.referenceProof!.nodes[0]).toMatchObject({
    kind: 'inference',
    formula: 'P -> P',
    ruleId: null,
    branches: [],
    lineReferences: [],
  });
});

test('changed targets retain all existing branches until an explicit confirmed restart', async () => {
  const { user, onSave } = setup(false, true);
  await user.clear(screen.getByLabelText('Conclusion'));
  await user.type(screen.getByLabelText('Conclusion'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Continue to reference proof' }));
  expect(screen.getByRole('region', { name: 'Reference statement mismatch' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Restart reference from statement' }));
  await user.click(screen.getByRole('button', { name: 'Keep reference' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(savedDefinition(onSave).referenceProof).toEqual(treeDerivationDefinition.referenceProof);
  await user.click(screen.getByRole('button', { name: 'Restart reference from statement' }));
  await user.click(screen.getByRole('button', { name: 'Restart reference' }));
  expect(
    screen.queryByRole('region', { name: 'Reference statement mismatch' }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const proof = savedDefinition(onSave).referenceProof!;
  expect(proof.nodes).toHaveLength(1);
  expect(proof.nodes[0]).toMatchObject({
    kind: 'inference',
    formula: 'Q',
    branches: [],
    ruleId: null,
  });
  expect(proof.rootId).toBe(proof.nodes[0]!.id);
  expect(proof.rootId).not.toBe(treeDerivationDefinition.referenceProof!.rootId);
});

test('unfinished statements remain saveable but cannot start reference construction', async () => {
  const { user, onSave } = setup();
  await user.type(screen.getByLabelText('New premise'), 'P &');
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(savedDefinition(onSave).referenceProof).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Continue to reference proof' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Premise 1:');
  expect(screen.getByRole('button', { name: '1. Problem details' })).toHaveAttribute(
    'aria-current',
    'step',
  );
});

test('archived tree viewing does not create a reference or enable source editing', async () => {
  const { user, onSave, onDirty } = setup(true);
  expect(screen.getByLabelText('New premise')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '2. Reference proof' }));
  expect(screen.getByRole('button', { name: 'Start reference proof' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(onDirty).toHaveBeenLastCalledWith(false);
  expect(onSave).not.toHaveBeenCalled();
});
