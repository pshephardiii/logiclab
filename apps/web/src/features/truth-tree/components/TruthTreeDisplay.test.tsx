import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { initialTruthTree, appendTruthTreeExpansion } from '../helpers/construction';
import { TruthTreeDisplay } from './TruthTreeDisplay';

function fixture() {
  const initial = initialTruthTree({
    premises: [{ id: crypto.randomUUID(), formula: 'P -> Q' }],
    conclusion: 'R',
  });
  return appendTruthTreeExpansion(
    initial,
    initial.rootBranchId!,
    initial.occurrences[0]!.id,
    'conditional',
    [['!P'], ['Q']],
  );
}

test('read-only diagrams retain numbered formulas and named branch regions with decorative connectors', () => {
  const tree = fixture();
  render(<TruthTreeDisplay tree={tree} />);
  const display = screen.getByRole('region', { name: 'Truth tree' });

  expect(within(display).getAllByRole('listitem')).toHaveLength(tree.occurrences.length);
  expect(
    within(screen.getByRole('region', { name: 'Branch 1' })).getByText('P → Q'),
  ).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Branch 2' })).toHaveTextContent('¬P');
  expect(screen.getByRole('region', { name: 'Branch 3' })).toHaveTextContent('Q');
  expect(screen.getByRole('group', { name: 'Tree diagram' })).toHaveAttribute('tabindex', '0');
  expect(display.querySelectorAll('svg')).toHaveLength(1);
  expect(within(display).queryByRole('textbox')).not.toBeInTheDocument();
});

test('diagram edits retain occurrence identity, respect disabled state and leave source data unchanged', async () => {
  const tree = fixture();
  const before = structuredClone(tree);
  const onFormula = vi.fn();
  const view = render(<TruthTreeDisplay tree={tree} onFormula={onFormula} />);
  const field = screen.getByLabelText('Formula 3');
  await userEvent.setup().clear(field);

  expect(onFormula).toHaveBeenLastCalledWith(tree.occurrences[2]!.id, '');
  expect(tree).toEqual(before);
  expect(screen.queryByLabelText('Formula 1')).not.toBeInTheDocument();
  view.rerender(<TruthTreeDisplay tree={tree} onFormula={onFormula} disabled />);
  expect(screen.getByLabelText('Formula 3')).toBeDisabled();
});
