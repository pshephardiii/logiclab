import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { installDialogStub } from '../../../../test/unsaved-work';
import { DerivationRuleFields } from './DerivationRuleFields';

installDialogStub();

test('catalog-2 authoring retains a custom extraction label through disable and re-enable', async () => {
  function Harness() {
    const [rules, setRules] = useState([{ id: 'and_chain_elimination', label: 'Simplification' }]);
    const [labels, setLabels] = useState<Record<string, string>>({
      and_chain_elimination: 'Simplification',
    });
    return (
      <DerivationRuleFields
        ruleCatalogVersion={2}
        rules={rules}
        labels={labels}
        onChange={(nextRules, nextLabels) => {
          setRules(nextRules);
          setLabels(nextLabels);
        }}
      />
    );
  }
  render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: /Permitted rules/ }));
  await screen.findByRole('dialog');
  const label = screen.getByLabelText('Label for Conjunct extraction');
  expect(label).toHaveValue('Simplification');
  fireEvent.change(label, { target: { value: 'Chain ∧E' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Conjunct extraction' }));
  expect(screen.queryByLabelText('Label for Conjunct extraction')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Conjunct extraction' }));
  expect(screen.getByLabelText('Label for Conjunct extraction')).toHaveValue('Chain ∧E');
});
