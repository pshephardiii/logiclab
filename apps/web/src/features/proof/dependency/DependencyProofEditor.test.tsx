import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DependencyProof } from '@logiclab/contracts';
import { DependencyProofEditor } from './DependencyProofEditor';

const source = '11111111-1111-4111-8111-111111111111';
const inference = '22222222-2222-4222-8222-222222222222';
const statement = { premises: [], rules: [{ id: 'reiteration', label: 'Repeat' }] };

function setup() {
  const initial: DependencyProof = {
    proofVersion: 1,
    format: 'dependency',
    steps: [
      { id: source, kind: 'assumption', formula: 'P', dependencies: [source] },
      {
        id: inference,
        kind: 'inference',
        formula: 'P',
        dependencies: [source],
        ruleId: 'reiteration',
        lineReferences: [source],
        discharges: [],
      },
    ],
  };
  const onChange = vi.fn();

  function Harness() {
    const [proof, setProof] = useState<DependencyProof | null>(initial);
    return (
      <DependencyProofEditor
        statement={statement}
        proof={proof}
        purpose="student"
        onChange={(next) => {
          setProof(next);
          onChange(next);
        }}
      />
    );
  }

  render(<Harness />);
  return { user: userEvent.setup(), onChange, initial };
}

test('shows the entered proof and opens one line without modifying work', async () => {
  const { user, onChange } = setup();
  const display = screen.getByRole('region', { name: 'Entered dependency proof' });
  expect(within(display).getAllByRole('row')).toHaveLength(3);
  expect(display).toHaveTextContent('Repeat · 1');
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P');
  expect(screen.queryByLabelText('Formula for line 2')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Edit line 2' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Edit line 2' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.queryByLabelText('Formula for line 1')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 2'), ' &');
  expect(within(display).getByText('P &')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(onChange.mock.lastCall![0].steps[1]).toMatchObject({ id: inference, formula: 'P &' });
});

test('selection follows stable identities through moves and missing references remain visible after deletion', async () => {
  const { user, onChange, initial } = setup();
  await user.click(screen.getByRole('button', { name: 'Edit line 2' }));
  await user.click(screen.getByRole('button', { name: 'Move line 2 up' }));
  expect(screen.getByLabelText('Rule for line 1')).toHaveValue('reiteration');
  const display = screen.getByRole('region', { name: 'Entered dependency proof' });
  expect(display).toHaveTextContent('Repeat · 2');
  expect(onChange.mock.lastCall![0].steps[0]).toEqual(initial.steps[1]);

  await user.click(screen.getByRole('button', { name: 'Edit line 2' }));
  await user.click(screen.getByRole('button', { name: 'Delete line 2' }));
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(display).toHaveTextContent('Missing line');
  expect(onChange.mock.lastCall![0].steps).toEqual([initial.steps[1]]);
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P');
});

test('insertion selects the new line while retaining incomplete work and existing references', async () => {
  const { user, onChange, initial } = setup();
  await user.selectOptions(screen.getByLabelText('Insert before'), source);
  await user.click(screen.getByRole('button', { name: 'Add inference line' }));
  const next = onChange.mock.lastCall![0] as DependencyProof;
  expect(next.steps.slice(1)).toEqual(initial.steps);
  expect(next.steps[0]).toMatchObject({ formula: '', ruleId: null, dependencies: [] });
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('');
  expect(screen.getByRole('region', { name: 'Entered dependency proof' })).toHaveTextContent(
    'Repeat · 2',
  );
});
