import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ProofHelp } from './ProofHelp';
import { ProofRuleHelp } from './ProofRuleHelp';
import { ProofKeyboardGuide } from './ProofKeyboardGuide';

test.each(['fitch', 'dependency', 'tree'] as const)(
  'shows the enabled custom label, exact pattern and %s example without checking work',
  async (format) => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    render(
      <ProofHelp
        format={format}
        rules={[{ id: 'negation_introduction', label: 'Our negation rule' }]}
      />,
    );
    await user.click(screen.getByText('Rule reference (1 enabled)'));
    expect(screen.queryByText('Rule help: Modus tollens')).not.toBeInTheDocument();
    await user.click(screen.getByText('Rule help: Our negation rule'));
    await screen.findByRole('group', { name: 'Abstract rule pattern' });
    expect(screen.getByRole('group', { name: 'Abstract rule pattern' })).toHaveTextContent('⊥');
    expect(screen.getByRole('region', { name: `Worked ${format} example` })).toBeInTheDocument();
    expect(
      screen
        .getByRole('group', { name: 'Abstract rule pattern' })
        .closest('details')!
        .querySelectorAll('p'),
    ).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  },
);

test('an unpermitted selected rule does not gain a help entry or change permissions', () => {
  render(<ProofRuleHelp format="dependency" rules={[]} ruleId="negation_introduction" />);
  expect(screen.queryByText(/Rule help/)).not.toBeInTheDocument();
});

test('keyboard guide contains notation table without explanatory paragraphs', async () => {
  const user = userEvent.setup();
  render(<ProofKeyboardGuide />);
  await user.click(screen.getByText('Keyboard guide'));
  const table = screen.getByRole('table', { name: 'Keyboard inputs for proof formulas' });
  expect(within(table).getByRole('row', { name: 'Contradiction _|_ ⊥' })).toBeInTheDocument();
  expect(table.closest('details')!.querySelectorAll('p')).toHaveLength(0);
  expect(within(table).getByRole('row', { name: 'Negation ! or ~ ¬' })).toBeInTheDocument();
});
