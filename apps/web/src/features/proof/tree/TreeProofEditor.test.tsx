import { nodeAction } from '../../../../test/proof-controls';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { TreeProof } from '@logiclab/contracts';
import { treeDerivationDefinition } from '../../../../test/derivation';
import { installDialogStub } from '../../../../test/unsaved-work';
import { TreeProofEditor } from './TreeProofEditor';
import { TreeProofPreview } from './TreeProofPreview';

installDialogStub();

function setup(initial: TreeProof = structuredClone(treeDerivationDefinition.referenceProof!)) {
  const changed = vi.fn();
  let current = initial;
  function Harness() {
    const [proof, setProof] = useState<TreeProof | null>(initial);
    return (
      <TreeProofEditor
        statement={treeDerivationDefinition}
        purpose="student"
        proof={proof}
        onChange={(next) => {
          changed(next);
          if (next) current = next;
          setProof(next);
        }}
      />
    );
  }
  render(<Harness />);
  return { user: userEvent.setup(), changed, current: () => current };
}

test('selects a node in the visual tree without changing the proof and edits only that node', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const { user, changed, current } = setup(proof);
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P → P');
  expect(screen.queryByLabelText('Formula for node 1')).not.toBeInTheDocument();
  const preview = screen.getByRole('region', { name: 'Tree preview' });
  expect(within(preview).getByText('P → P')).toBeInTheDocument();
  expect(within(preview).getByText('[P]')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Edit node 1' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveFocus();
  expect(screen.queryByLabelText('Formula for node 2')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit node 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(changed).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Formula for node 1'), ' &');
  expect(current().nodes[0]).toEqual({ ...proof.nodes[0], formula: 'P ∧' });
  expect(current().nodes[1]).toEqual(proof.nodes[1]);
  expect(current().rootId).toBe(proof.rootId);
  expect(proof.nodes[0]!.formula).toBe('P');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('new unattached nodes open for editing without silently connecting or changing the root', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const { user, current } = setup(proof);
  await user.click(screen.getByRole('button', { name: 'New assumption node' }));
  expect(screen.getByLabelText('Formula for node 3')).toHaveFocus();
  expect(screen.queryByRole('region', { name: 'Unattached proof nodes' })).not.toBeInTheDocument();
  expect(current()).toEqual(proof);
  await user.type(screen.getByLabelText('Formula for node 3'), '~Q');
  await user.click(screen.getByRole('button', { name: 'Add node' }));
  const detached = screen.getByRole('region', { name: 'Unattached proof nodes' });
  expect(within(detached).getByRole('button', { name: 'Edit node 3' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(current().rootId).toBe(proof.rootId);
  expect(current().nodes.slice(0, 2)).toEqual(proof.nodes);
  await user.click(screen.getByRole('button', { name: 'Edit node 2' }));
  await user.click(screen.getByRole('button', { name: 'Edit node 3' }));
  expect(screen.getByLabelText('Formula for node 3')).toHaveValue('¬Q');
});

test('cyclic layouts expose a selectable repair list and retain their original references', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const root = proof.nodes[1]!;
  if (root.kind !== 'inference') throw new Error('Expected inference');
  root.branches[0]!.rootId = root.id;
  const original = structuredClone(proof);
  const { user, changed, current } = setup(proof);
  expect(screen.getByText(/The diagram cannot show shared or cyclic/)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Retained proof nodes' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Edit node 1' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveFocus();
  expect(changed).not.toHaveBeenCalled();
  expect(current()).toEqual(original);
});

test('a missing root leaves every node accessible until the user explicitly chooses a replacement', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  proof.rootId = crypto.randomUUID();
  const { user, changed, current } = setup(proof);
  expect(
    screen.getByText('Select an existing conclusion root to draw the tree.'),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: 'Unattached proof nodes' })).getAllByRole('button', {
      name: /^Edit node [0-9]+$/,
    }),
  ).toHaveLength(2);
  expect(changed).not.toHaveBeenCalled();
  await nodeAction(user, 2, 'Use node 2 as conclusion root');
  expect(current().nodes).toEqual(proof.nodes);
  expect(current().rootId).toBe(proof.nodes[1]!.id);
  expect(
    screen.queryByText('Select an existing conclusion root to draw the tree.'),
  ).not.toBeInTheDocument();
});

test('deleting a selected assumption preserves unresolved references and selects the retained root', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const { user, current } = setup(proof);
  await user.click(screen.getByRole('button', { name: 'Edit node 1' }));
  await nodeAction(user, 1, 'Delete node 1');
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(current().nodes).toEqual([proof.nodes[1]]);
  expect(current().rootId).toBe(proof.rootId);
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P → P');
  expect(screen.getByText('Unselected or missing node')).toBeInTheDocument();
  expect(screen.getByText('Missing assumption occurrence')).toBeInTheDocument();
});

test('read-only previews render entered notation and provide no editing controls', () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const original = structuredClone(proof);
  render(<TreeProofPreview proof={proof} rules={treeDerivationDefinition.rules} />);
  expect(screen.getByText('P → P')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(proof).toEqual(original);
});

test('new inference branches and discharge selections stay local until Add node', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const { user, changed, current } = setup(proof);
  await user.click(screen.getByRole('button', { name: 'New inference node' }));
  await user.type(screen.getByLabelText('Formula for node 3'), 'P -> P');
  await user.selectOptions(screen.getByLabelText('Rule for node 3'), 'implication_introduction');
  await user.selectOptions(screen.getByLabelText('Node 3 branch 1 root'), proof.nodes[0]!.id);
  await user.type(screen.getByLabelText('Node 3 branch 1 assumption formula'), 'P');
  await user.click(screen.getByRole('checkbox', { name: /Discharge node 1/ }));
  expect(changed).not.toHaveBeenCalled();
  expect(current()).toEqual(proof);
  expect(screen.getByRole('button', { name: 'Edit node 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Actions for node 2' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Clear proof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Add node' }));
  expect(current().nodes[2]).toMatchObject({
    kind: 'inference',
    formula: 'P → P',
    ruleId: 'implication_introduction',
    branches: [
      { rootId: proof.nodes[0]!.id, assumptionFormula: 'P', assumptionIds: [proof.nodes[0]!.id] },
    ],
  });
  expect(current().nodes.slice(0, 2)).toEqual(proof.nodes);
  expect(current().rootId).toBe(proof.rootId);
  expect(screen.getByRole('button', { name: 'Edit node 1' })).toBeEnabled();
});

test('discarding an entry preserves the confirmed proof; Enter confirms without checking incomplete formulas', async () => {
  const { user, changed, current } = setup();
  const initial = structuredClone(current());
  await user.click(screen.getByRole('button', { name: 'New assumption node' }));
  await user.type(screen.getByLabelText('Formula for node 3'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(changed).not.toHaveBeenCalled();
  expect(current()).toEqual(initial);
  expect(screen.getByLabelText('Formula for node 2')).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'New assumption node' }));
  await user.type(screen.getByLabelText('Formula for node 3'), 'P &');
  fireEvent.keyDown(screen.getByLabelText('Formula for node 3'), {
    key: 'Enter',
    isComposing: true,
  });
  expect(changed).not.toHaveBeenCalled();
  await user.keyboard('{Enter}');
  expect(current().nodes[2]!.formula).toBe('P ∧');
  expect(screen.queryByRole('region', { name: 'Unconfirmed proof node' })).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('stale entries cannot replace reloaded/null proofs, and pending registration clears on discard or unmount', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const changed = vi.fn(),
    pending = vi.fn();
  const props = {
    statement: treeDerivationDefinition,
    purpose: 'student' as const,
    onChange: changed,
    onPendingChange: pending,
  };
  const view = render(<TreeProofEditor {...props} proof={proof} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'New assumption node' }));
  await user.type(screen.getByLabelText('Formula for node 3'), 'Q');
  expect(pending).toHaveBeenLastCalledWith(true);
  view.rerender(<TreeProofEditor {...props} proof={structuredClone(proof)} />);
  await user.click(screen.getByRole('button', { name: 'Add node' }));
  expect(screen.getByRole('alert')).toHaveTextContent('proof changed');
  expect(changed).not.toHaveBeenCalled();
  view.rerender(<TreeProofEditor {...props} proof={null} />);
  expect(screen.getByRole('button', { name: 'Start proof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(pending).toHaveBeenLastCalledWith(false);
  view.rerender(<TreeProofEditor {...props} proof={proof} />);
  await user.click(screen.getByRole('button', { name: 'New assumption node' }));
  view.unmount();
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(changed).not.toHaveBeenCalled();
});

test('guided branch creation connects a new assumption only on confirmation with explicit discharge', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  proof.nodes = [proof.nodes[1]!];
  const root = proof.nodes[0]!;
  if (root.kind !== 'inference') throw new Error('Expected inference');
  root.branches = [];
  const { user, current, changed } = setup(proof);
  await nodeAction(user, 1, 'New branch assumption for node 1');
  await user.type(screen.getByLabelText('Formula for node 2'), 'P');
  await user.type(screen.getByLabelText('Branch assumption formula'), 'P');
  const discharge = screen.getByRole('checkbox', { name: /Discharge node 2:/ });
  expect(discharge).not.toBeChecked();
  expect(changed).not.toHaveBeenCalled();
  await user.click(discharge);
  await user.click(screen.getByRole('button', { name: 'Add node' }));
  expect(current().nodes[0]).toMatchObject({
    branches: [
      {
        rootId: current().nodes[1]!.id,
        assumptionFormula: 'P',
        assumptionIds: [current().nodes[1]!.id],
      },
    ],
  });
  expect(current().rootId).toBe(proof.rootId);
  expect(screen.queryByRole('region', { name: 'Unattached proof nodes' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Tree preview' })).toHaveTextContent('[P]');
});

test('discarding a guided connection retains the parent and cancelled deletion restores its node menu focus', async () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  proof.nodes = [proof.nodes[1]!];
  const root = proof.nodes[0]!;
  if (root.kind !== 'inference') throw new Error('Expected inference');
  root.branches = [];
  const { user, current, changed } = setup(proof);
  await nodeAction(user, 1, 'New branch inference for node 1');
  await user.type(screen.getByLabelText('Formula for node 2'), 'Q');
  expect(screen.getByRole('button', { name: 'Actions for node 1' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(current()).toEqual(proof);
  expect(changed).not.toHaveBeenCalled();
  await nodeAction(user, 1, 'Delete node 1');
  await user.click(screen.getByRole('button', { name: 'Keep proof' }));
  expect(screen.getByRole('button', { name: 'Actions for node 1' })).toHaveFocus();
  expect(changed).not.toHaveBeenCalled();
});
