import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { propositionalRuleCatalog } from '@logiclab/logic-engine/proof/rules';
import { installDialogStub } from '../../../../test/unsaved-work';
import { ProofRulesDialog } from './ProofRulesDialog';

installDialogStub();

test.each([1, 2] as const)('rule selection and Select all use pinned catalog %s', (version) => {
  const onChange = vi.fn();
  render(
    <ProofRulesDialog
      ruleCatalogVersion={version}
      selected={['reiteration']}
      onChange={onChange}
      onClose={vi.fn()}
    />,
  );
  const catalog = propositionalRuleCatalog(version);
  expect(screen.getAllByRole('checkbox')).toHaveLength(catalog.length);
  expect(screen.getByRole('checkbox', { name: 'Reiteration' })).toBeChecked();
  expect(screen.queryByRole('checkbox', { name: 'Conjunct extraction' }) !== null).toBe(
    version === 2,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
  expect(onChange).toHaveBeenLastCalledWith(catalog.map((rule) => rule.id));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(onChange).toHaveBeenLastCalledWith([]);

  if (version === 2) {
    const derived = screen.getByRole('group', { name: 'Derived rules' });
    fireEvent.click(within(derived).getByRole('checkbox', { name: 'Conjunct extraction' }));
    expect(onChange).toHaveBeenLastCalledWith(['reiteration', 'and_chain_elimination']);
  }
});

test('omitting the catalog preserves the original rule inventory', () => {
  render(<ProofRulesDialog selected={[]} onChange={vi.fn()} onClose={vi.fn()} />);
  expect(screen.queryByRole('checkbox', { name: 'Conjunct extraction' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('checkbox')).toHaveLength(propositionalRuleCatalog(1).length);
});
