import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ProofRuleReference } from './ProofRuleHelp';

const rules = [{ id: 'and_chain_elimination', label: 'Chain simplification' }];

test.each(['fitch', 'dependency'] as const)(
  '%s extraction help shows a selected conjunct',
  (format) => {
    render(<ProofRuleReference ruleId="and_chain_elimination" rules={rules} format={format} />);
    const pattern = screen.getByRole('group', { name: 'Abstract rule pattern' });
    expect(within(pattern).getByText('A ∧ B ∧ C')).toBeInTheDocument();
    expect(within(pattern).getByText('B')).toBeInTheDocument();
    const example = screen.getByRole('table');
    expect(within(example).getByText(/Chain simplification · 1 · conjunct 2/)).toBeInTheDocument();
    expect(within(example).getByText('Q')).toBeInTheDocument();
  },
);

test('help requires explicit permission and never offers the new variant for retained trees', () => {
  const view = render(
    <ProofRuleReference ruleId="and_chain_elimination" rules={[]} format="fitch" />,
  );
  expect(view.container).toBeEmptyDOMElement();
  view.rerender(<ProofRuleReference ruleId="and_chain_elimination" rules={rules} format="tree" />);
  expect(view.container).toBeEmptyDOMElement();
});
