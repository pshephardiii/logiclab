import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { treeDerivationDefinition, derivationDraft } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';
import { DerivationSummary } from './DerivationSummary';
import { TreeProofSummary } from '../../../features/proof/tree/TreeProofSummary';

test('saved tree drafts retain their private reference without exposing editing or save controls', async () => {
  const onSave = vi.fn(),
    onDirty = vi.fn();
  const problem = { ...derivationDraft, definition: treeDerivationDefinition };
  const before = structuredClone(problem);
  render(
    <ProblemForm
      problem={problem}
      busy={false}
      onSave={onSave}
      onDirty={onDirty}
      onPreview={vi.fn()}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('retained draft is read-only');
  expect(screen.queryByLabelText('Proof format')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByText('Private reference proof'));
  expect(screen.getByRole('region', { name: 'Private reference proof diagram' })).toHaveTextContent(
    'Conditional proof',
  );
  expect(onSave).not.toHaveBeenCalled();
  expect(onDirty).toHaveBeenLastCalledWith(false);
  expect(problem).toEqual(before);
});

test('private tree summaries display branches, instructor terminology and explanation without Fitch assumptions', async () => {
  const user = userEvent.setup();
  render(<DerivationSummary definition={treeDerivationDefinition} />);
  expect(screen.getByText('Natural-deduction tree')).toBeInTheDocument();
  await user.click(screen.getByText('Private reference proof'));
  const details = screen.getByText('Private reference proof').closest('details')!;
  const diagram = within(details).getByRole('region', { name: 'Private reference proof diagram' });
  expect(diagram).toHaveTextContent('Node 2 · Conditional proof');
  expect(within(details).queryByRole('list')).not.toBeInTheDocument();
  expect(within(details).queryByRole('button')).not.toBeInTheDocument();
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
