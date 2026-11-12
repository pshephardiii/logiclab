import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { installDialogStub } from '../../../../test/unsaved-work';
import { startDependencyProof } from './editor';
import { DependencyRangeDeletionDialog } from './DependencyRangeDeletionDialog';

installDialogStub();

test('authoritative replacement blocks deletion from an old snapshot', async () => {
  const proof = startDependencyProof([{ id: crypto.randomUUID(), formula: 'P' }]);
  const onConfirm = vi.fn();
  const props = {
    proof,
    currentProof: proof,
    from: proof.steps[0]!.id,
    to: proof.steps[0]!.id,
    onConfirm,
    onCancel: vi.fn(),
  };
  const view = render(<DependencyRangeDeletionDialog {...props} />);
  expect(screen.getByRole('button', { name: 'Delete selected lines' })).toBeEnabled();
  view.rerender(<DependencyRangeDeletionDialog {...props} currentProof={{ ...proof }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('proof changed');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Delete selected lines' }));
  expect(onConfirm).not.toHaveBeenCalled();
});

test('deleting a middle interval preserves surrounding identities and unresolved references', async () => {
  const proof = startDependencyProof([
    { id: crypto.randomUUID(), formula: 'P' },
    { id: crypto.randomUUID(), formula: 'Q' },
    { id: crypto.randomUUID(), formula: 'R' },
  ]);
  const removedId = proof.steps[1]!.id;
  proof.steps.push({
    id: crypto.randomUUID(),
    kind: 'inference',
    formula: 'Q',
    dependencies: [removedId],
    ruleId: 'reiteration',
    lineReferences: [removedId],
    discharges: [{ assumptionId: removedId, conclusionId: proof.steps[2]!.id }],
  });
  const before = structuredClone(proof);
  const onConfirm = vi.fn();
  render(
    <DependencyRangeDeletionDialog
      proof={proof}
      currentProof={proof}
      from={proof.steps[2]!.id}
      to={removedId}
      onConfirm={onConfirm}
      onCancel={vi.fn()}
    />,
  );
  await userEvent.setup().click(screen.getByRole('button', { name: 'Delete selected lines' }));
  expect(onConfirm).toHaveBeenCalledWith({ ...proof, steps: [proof.steps[0], proof.steps[3]] });
  expect(proof).toEqual(before);
});
