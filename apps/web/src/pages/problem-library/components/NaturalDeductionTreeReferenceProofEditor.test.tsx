import { nodeAction } from '../../../../test/proof-controls';
import { installDialogStub } from '../../../../test/unsaved-work';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import type { NaturalDeductionTreeDerivationDefinition } from '@logiclab/contracts/natural-deduction-tree-derivation';
import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
import { naturalDeductionTreeDerivationDefinition } from '../../../../test/derivation';
import { ReferenceProofEditor } from './ReferenceProofEditor';
import { LocalReferenceCheck } from './LocalReferenceCheck';

installDialogStub();

// Exercise retained implementation directly. ProblemForm deliberately provides no app entry to it.
function setup(
  initial: NaturalDeductionTreeDerivationDefinition = {
    ...naturalDeductionTreeDerivationDefinition,
    referenceProof: null,
  },
) {
  const onChange = vi.fn();
  function Harness() {
    const [definition, setDefinition] = useState<AuthoringDerivationDefinition>(initial);
    const [pending, setPending] = useState(false);
    return (
      <>
        <ReferenceProofEditor
          definition={definition}
          onPendingChange={setPending}
          onChange={(next) => {
            setDefinition(next);
            onChange(next);
          }}
        />
        <LocalReferenceCheck definition={definition} disabled={pending} />
      </>
    );
  }
  render(<Harness />);
  return { user: userEvent.setup(), onChange };
}

test('retained reference editor can still construct and check an identity tree independently of app admission', async () => {
  const { user, onChange } = setup();
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
    within(screen.getByRole('region', { name: 'Natural-deduction tree preview' })).getByText('[P]'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(onChange).toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Current reference accepted');
  const value = onChange.mock.lastCall![0];
  if (value.type !== 'derivation' || value.format !== 'tree') throw Error();
  expect(value.referenceProof!.nodes).toHaveLength(2);
  expect(value.referenceProof!.nodes[0]).toMatchObject({
    branches: [{ rootId: choice.value, assumptionFormula: 'P', assumptionIds: [choice.value] }],
  });
  await user.click(screen.getByRole('button', { name: 'Edit node 2' }));
  expect(screen.getByLabelText('Formula for node 2')).toHaveValue('P');
  await user.clear(screen.getByLabelText('Formula for node 2'));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('confirmed node deletion retains missing child and assumption identities for explicit repair', async () => {
  const { user, onChange } = setup(naturalDeductionTreeDerivationDefinition);
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
  const value = onChange.mock.lastCall![0];
  if (value.type !== 'derivation' || value.format !== 'tree') throw Error();
  expect(value.referenceProof!.nodes).toEqual([
    naturalDeductionTreeDerivationDefinition.referenceProof!.nodes[1],
  ]);
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
