import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { NaturalDeductionTreeProof } from '@logiclab/contracts';
import { naturalDeductionTreeDerivationDefinition } from '../../../../test/derivation';
import { NaturalDeductionTreeProofSummary } from './NaturalDeductionTreeProofSummary';

const rules = naturalDeductionTreeDerivationDefinition.rules;
const fixture = () => structuredClone(naturalDeductionTreeDerivationDefinition.referenceProof!);
async function open(proof: NaturalDeductionTreeProof | null) {
  render(<NaturalDeductionTreeProofSummary proof={proof} rules={rules} label="Submitted tree" />);
  await userEvent.setup().click(screen.getByText('Submitted tree'));
}

test('read-only tree is the primary view with normalized notation, numbered nodes and explicit discharge', async () => {
  const proof = fixture();
  const before = structuredClone(proof);
  await open(proof);
  const diagram = screen.getByRole('region', { name: 'Submitted tree diagram' });
  expect(within(diagram).getByText('P → P')).toBeInTheDocument();
  expect(within(diagram).getByText('[P]')).toBeInTheDocument();
  expect(diagram).toHaveTextContent('Node 2 · Conditional proof');
  expect(diagram).toHaveTextContent('Assuming P; discharge nodes 1');
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByText(/verified|accepted|will also be checked/i)).not.toBeInTheDocument();
  expect(proof).toEqual(before);
});

test('unattached entries remain visible with original node numbers without duplicating the connected tree', async () => {
  const proof = fixture();
  proof.nodes.push({ kind: 'premise', id: 'detached', formula: '~Q', premiseId: null });
  const before = structuredClone(proof);
  await open(proof);
  expect(screen.getByRole('region', { name: 'Submitted tree diagram' })).toBeInTheDocument();
  const retained = screen.getByRole('region', { name: 'Unattached proof nodes' });
  expect(within(retained).getAllByRole('listitem')).toHaveLength(1);
  expect(within(retained).getByRole('listitem')).toHaveAttribute('value', '3');
  expect(retained).toHaveTextContent('¬Q — Premise');
  expect(screen.getAllByText('P → P')).toHaveLength(1);
  expect(proof).toEqual(before);
});

test('unresolved supports, blank branch formulas and missing discharge identities stay visible in a drawable tree', async () => {
  const proof = fixture();
  const root = proof.nodes[1]!;
  if (root.kind !== 'inference') throw new Error('Expected inference');
  root.lineReferences = ['missing'];
  root.branches[0]!.assumptionFormula = '';
  root.branches[0]!.assumptionIds = ['missing'];
  root.ruleId = 'unavailable';
  const before = structuredClone(proof);
  await open(proof);
  const diagram = screen.getByRole('region', { name: 'Submitted tree diagram' });
  expect(diagram).toHaveTextContent('Unselected or missing node');
  expect(diagram).toHaveTextContent('Assuming (blank); discharge nodes ?');
  expect(diagram).toHaveTextContent('Rule not enabled');
  expect(proof).toEqual(before);
});

test.each(['cycle', 'shared', 'duplicate', 'missing root'] as const)(
  '%s keeps all entered nodes in a noninteractive fallback instead of drawing a misleading tree',
  async (kind) => {
    const proof = fixture();
    const root = proof.nodes[1]!;
    if (root.kind !== 'inference') throw new Error('Expected inference');
    if (kind === 'cycle') root.lineReferences = [root.id];
    if (kind === 'shared') root.lineReferences = [proof.nodes[0]!.id];
    if (kind === 'duplicate') proof.nodes[0]!.id = root.id;
    if (kind === 'missing root') proof.rootId = 'missing';
    root.formula = '';
    const before = structuredClone(proof);
    await open(proof);
    expect(
      screen.queryByRole('region', { name: 'Submitted tree diagram' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('(blank)')).toBeInTheDocument();
    expect(screen.getByText(/All entered nodes are listed below/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(proof).toEqual(before);
  },
);

test.each([
  null,
  { proofVersion: 1, format: 'tree', rootId: null, nodes: [] } as NaturalDeductionTreeProof,
])(
  'null and empty proofs keep explanations without drawing or inventing nodes (%s)',
  async (proof) => {
    render(
      <NaturalDeductionTreeProofSummary proof={proof} rules={rules} label="Reference">
        <p>Private explanation</p>
      </NaturalDeductionTreeProofSummary>,
    );
    await userEvent.setup().click(screen.getByText('Reference'));
    expect(
      screen.getByText(proof ? 'No proof nodes entered.' : 'No proof entered.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Private explanation')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  },
);
