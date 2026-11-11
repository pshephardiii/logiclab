import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { CreateLibraryProblemRequest } from '@logiclab/contracts/problem-library';
import { installDialogStub } from '../../../../test/unsaved-work';
import { lineAction } from '../../../../test/proof-controls';
import { derivationDraft, derivationDefinition } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';

installDialogStub();

function setup(archived = false) {
  const onSave = vi
    .fn<(input: CreateLibraryProblemRequest) => Promise<boolean>>()
    .mockResolvedValue(false);
  const onDirty = vi.fn();
  const definition = { ...derivationDefinition, conclusion: 'P' };
  render(
    <ProblemForm
      problem={{
        ...derivationDraft,
        definition,
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
  if (definition.type !== 'derivation' || definition.format !== 'fitch')
    throw new Error('Expected Fitch');
  return definition;
}

test('confirmed premises seed once; detail edits preserve references until an explicit confirmed restart', async () => {
  const { user, onSave } = setup();
  expect(screen.getByRole('navigation', { name: 'Fitch authoring steps' })).toBeInTheDocument();
  await user.type(screen.getByLabelText('New premise'), 'P');
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '2. Reference proof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Add premise' }));
  await user.click(screen.getByRole('button', { name: 'Continue to reference proof' }));
  expect(screen.getByLabelText('Title')).not.toBeVisible();
  expect(screen.getByLabelText('New premise')).not.toBeVisible();
  expect(
    screen.getByRole('region', { name: 'Entered Fitch proof' }).querySelectorAll('tbody tr'),
  ).toHaveLength(1);
  expect(onSave).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const first = savedDefinition(onSave);
  expect(first.referenceProof).toMatchObject({
    blocks: [],
    steps: [{ kind: 'premise', blockId: null, premiseId: first.premises[0]!.id, formula: 'P' }],
  });
  expect(first.referenceProof!.steps).toHaveLength(1);
  const firstId = first.referenceProof!.steps[0]!.id;
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 2'), 'R');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const retained = savedDefinition(onSave).referenceProof;
  expect(retained!.blocks).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: '1. Problem details' }));
  await lineAction(user, 1, 'Edit line 1');
  await user.clear(screen.getByLabelText('Premise 1'));
  await user.type(screen.getByLabelText('Premise 1'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Update premise' }));
  await user.click(screen.getByRole('button', { name: '2. Reference proof' }));
  expect(screen.getByRole('region', { name: 'Reference premise mismatch' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Restart reference from statement' }));
  await user.click(screen.getByRole('button', { name: 'Keep reference' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(savedDefinition(onSave).referenceProof).toEqual(retained);
  await user.click(screen.getByRole('button', { name: 'Restart reference from statement' }));
  await user.click(screen.getByRole('button', { name: 'Restart reference' }));
  expect(
    screen.queryByRole('region', { name: 'Reference premise mismatch' }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const restarted = savedDefinition(onSave);
  expect(restarted.referenceProof!.steps).toHaveLength(1);
  expect(restarted.referenceProof!.blocks).toEqual([]);
  expect(restarted.referenceProof!.steps[0]).toMatchObject({
    kind: 'premise',
    formula: 'Q',
    premiseId: first.premises[0]!.id,
    blockId: null,
  });
  expect(restarted.referenceProof!.steps[0]!.id).not.toBe(firstId);
  expect(screen.getByRole('button', { name: '2. Reference proof' })).toHaveAttribute(
    'aria-current',
    'step',
  );
});

test('incomplete statements remain saveable but cannot enter reference construction', async () => {
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
  expect(screen.queryByRole('heading', { name: 'Reference proof' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(savedDefinition(onSave).referenceProof).toBeNull();
});

test('pending reference entry gates step changes and saving without dropping confirmed work', async () => {
  const { user, onSave, onDirty } = setup();
  await user.click(screen.getByRole('button', { name: 'Continue to reference proof' }));
  await user.type(screen.getByLabelText('Formula for line 1'), 'P');
  expect(screen.getByRole('button', { name: '1. Problem details' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '2. Reference proof' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check current proof' })).toBeDisabled();
  expect(onDirty).toHaveBeenLastCalledWith(true);
  expect(onSave).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(savedDefinition(onSave).referenceProof!.steps).toEqual([]);
  expect(screen.getByRole('button', { name: '1. Problem details' })).toBeEnabled();
});

test('viewing an archived reference does not seed a proof or permit edits', async () => {
  const { user, onSave, onDirty } = setup(true);
  await user.click(screen.getByRole('button', { name: '2. Reference proof' }));
  expect(screen.getByRole('button', { name: 'Start reference proof' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(onDirty).toHaveBeenLastCalledWith(false);
  expect(onSave).not.toHaveBeenCalled();
});
