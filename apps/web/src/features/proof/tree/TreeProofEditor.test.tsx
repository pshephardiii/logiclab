import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
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
  await user.click(screen.getByRole('button', { name: 'Add assumption node' }));
  expect(screen.getByLabelText('Formula for node 3')).toHaveFocus();
  const detached = screen.getByRole('region', { name: 'Unattached proof nodes' });
  expect(within(detached).getByRole('button', { name: 'Edit node 3' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(current().rootId).toBe(proof.rootId);
  expect(current().nodes.slice(0, 2)).toEqual(proof.nodes);
  await user.type(screen.getByLabelText('Formula for node 3'), '~Q');
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
  expect(screen.getByText(/Preview cannot draw shared or cyclic/)).toBeInTheDocument();
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
    within(screen.getByRole('region', { name: 'Unattached proof nodes' })).getAllByRole('button'),
  ).toHaveLength(2);
  expect(changed).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText('Conclusion root'), proof.nodes[1]!.id);
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
  await user.click(screen.getByRole('button', { name: 'Delete node 1' }));
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
