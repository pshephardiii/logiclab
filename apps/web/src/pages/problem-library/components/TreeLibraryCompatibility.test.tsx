import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { treeDerivationDefinition, derivationDraft } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';
import { DerivationSummary } from './DerivationSummary';
import { TreeProofSummary } from '../../../features/proof/tree/TreeProofSummary';

test('saved trees preserve their reference during statement edits and explicit failed saves', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(false);
  const onDirty = vi.fn();
  render(
    <ProblemForm
      problem={{ ...derivationDraft, definition: treeDerivationDefinition }}
      busy={false}
      onSave={onSave}
      onDirty={onDirty}
      onPreview={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');
  expect(screen.getByRole('region', { name: 'Tree reference proof editor' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start reference proof' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Current reference accepted');
  await user.clear(screen.getByLabelText('Conclusion'));
  await user.type(screen.getByLabelText('Conclusion'), 'Q');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('needs correction');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      definition: expect.objectContaining({
        format: 'tree',
        conclusion: 'Q',
        referenceProof: treeDerivationDefinition.referenceProof,
      }),
    }),
  );
  expect(screen.getByLabelText('Conclusion')).toHaveValue('Q');
  expect(onDirty).toHaveBeenLastCalledWith(true);
  await user.selectOptions(screen.getByLabelText('Proof format'), 'fitch');
  await user.click(screen.getByRole('button', { name: 'Keep current format' }));
  expect(screen.getByLabelText('Proof format')).toHaveValue('tree');
  await user.selectOptions(screen.getByLabelText('Proof format'), 'fitch');
  await user.click(screen.getByRole('button', { name: 'Change format and discard reference' }));
  expect(screen.getByLabelText('Proof format')).toHaveValue('fitch');
  expect(screen.getByRole('button', { name: 'Start reference proof' })).toBeInTheDocument();
});

test('private tree summaries display branches, instructor terminology and explanation without Fitch assumptions', async () => {
  const user = userEvent.setup();
  render(<DerivationSummary definition={treeDerivationDefinition} />);
  expect(screen.getByText('Natural-deduction tree')).toBeInTheDocument();
  await user.click(screen.getByText('Private reference proof'));
  const details = screen.getByText('Private reference proof').closest('details')!;
  expect(within(details).getByText(/Conclusion root: node 2/)).toBeInTheDocument();
  expect(within(details).getByText(/discharge nodes 1/)).toBeInTheDocument();
  expect(within(details).getByText('Private tree explanation')).toBeInTheDocument();
});

test('read-only tree summaries handle incomplete and cyclic draft data without recursion', () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  proof.rootId = null;
  const root = proof.nodes[1]!;
  if (root.kind !== 'inference') throw Error('Fixture needs an inference');
  root.formula = '';
  root.lineReferences = [root.id];
  root.branches = [
    {
      rootId: null,
      assumptionFormula: '',
      assumptionIds: ['ffffffff-ffff-4fff-8fff-ffffffffffff'],
    },
  ];
  render(<TreeProofSummary proof={proof} rules={[]} label="Draft tree" />);
  expect(screen.getByText(/Conclusion root: node \?/)).toBeInTheDocument();
  expect(screen.getByText(/Rule not enabled/)).toBeInTheDocument();
  expect(screen.getByText('(blank)')).toBeInTheDocument();
});
