import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { installDialogStub } from '../../../../test/unsaved-work';
import { startFitchProof } from '../helpers/fitch-editor';
import { FitchRangeDeletionDialog } from './FitchRangeDeletionDialog';

installDialogStub();
test('an authoritative replacement invalidates an open range instead of deleting from an old snapshot', async () => {
  const proof = startFitchProof({ premises: [{ id: crypto.randomUUID(), formula: 'P' }] });
  const onConfirm = vi.fn();
  const props = {
    proof,
    currentProof: proof,
    from: proof.steps[0]!.id,
    to: proof.steps[0]!.id,
    onConfirm,
    onCancel: vi.fn(),
  };
  const view = render(<FitchRangeDeletionDialog {...props} />);
  expect(screen.getByRole('button', { name: 'Delete selected lines' })).toBeEnabled();
  view.rerender(<FitchRangeDeletionDialog {...props} currentProof={{ ...proof, steps: [] }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('proof changed');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Delete selected lines' }));
  expect(onConfirm).not.toHaveBeenCalled();
});
