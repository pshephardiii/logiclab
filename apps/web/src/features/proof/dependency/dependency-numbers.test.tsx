import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { DependencyProof } from '@logiclab/contracts';
import { dependencyNumbers } from './dependency-numbers';
import { DependencyProofDisplay } from './DependencyProofDisplay';

test('sorts by current numeric line positions, retaining missing and duplicate references without mutation', () => {
  const ids = ['later', 'missing', 'early', 'early'];
  expect(
    dependencyNumbers(
      ids,
      new Map([
        ['later', 12],
        ['early', 2],
      ]),
    ),
  ).toBe('2, 2, 12, Missing line');
  expect(
    dependencyNumbers(
      ids,
      new Map([
        ['later', 1],
        ['early', 12],
      ]),
      '?',
    ),
  ).toBe('1, 12, 12, ?');
  expect(ids).toEqual(['later', 'missing', 'early', 'early']);
});

test('confirmed dependency numbers display in ascending order even when clicked in reverse order', () => {
  const proof: DependencyProof = {
    proofVersion: 1,
    format: 'dependency',
    steps: Array.from({ length: 12 }, (_, index) => ({
      kind: 'assumption',
      id: String(index + 1),
      formula: 'P',
      dependencies: [String(index + 1)],
    })),
  };
  proof.steps.push({
    id: 'last',
    kind: 'inference',
    formula: 'P',
    ruleId: 'reiteration',
    lineReferences: ['2'],
    discharges: [],
    dependencies: ['12', '3', '2'],
  });
  const before = structuredClone(proof);
  render(
    <DependencyProofDisplay
      proof={proof}
      rules={[]}
      selectedId={null}
      onEdit={vi.fn()}
      onMove={vi.fn()}
      onInsert={vi.fn()}
      onDelete={vi.fn()}
      entryLabel="New proof line"
    />,
  );
  expect(screen.getByRole('cell', { name: '{2, 3, 12}' })).toBeInTheDocument();
  expect(proof).toEqual(before);
});

test('practice can omit assumption guides without changing proof data or the default display', () => {
  const proof: DependencyProof = {
    proofVersion: 1,
    format: 'dependency',
    steps: [{ id: 'assumption', kind: 'assumption', formula: 'P', dependencies: ['assumption'] }],
  };
  const before = structuredClone(proof);
  const props = { proof, rules: [], selectedId: null };
  const view = render(<DependencyProofDisplay {...props} />);
  expect(view.container.querySelector('.dependency-assumption-guide')).not.toBeNull();
  view.rerender(<DependencyProofDisplay {...props} showAssumptionGuides={false} />);
  expect(view.container.querySelector('.dependency-assumption-guides')).toBeNull();
  expect(view.container.querySelector('table')).toHaveStyle('--dependency-guide-width: 0rem');
  expect(screen.getByRole('cell', { name: '{1}' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Assumption' })).toBeInTheDocument();
  expect(proof).toEqual(before);
});
