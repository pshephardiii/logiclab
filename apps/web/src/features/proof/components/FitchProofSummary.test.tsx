import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { FitchProof } from '@logiclab/contracts';
import { FitchProofSummary } from './FitchProofSummary';
import { FitchProofDisplay } from './FitchProofDisplay';

function fixture(): FitchProof {
  const outer = crypto.randomUUID(),
    inner = crypto.randomUUID();
  const assumption = crypto.randomUUID(),
    nested = crypto.randomUUID();
  const ending = crypto.randomUUID(),
    final = crypto.randomUUID();
  return {
    proofVersion: 1,
    format: 'fitch',
    steps: [
      { id: assumption, kind: 'assumption', blockId: outer, formula: '!P' },
      { id: nested, kind: 'assumption', blockId: inner, formula: 'Q' },
      {
        id: ending,
        kind: 'inference',
        blockId: outer,
        formula: 'Q -> !P',
        ruleId: 'implication_introduction',
        lineReferences: [],
        subproofReferences: [inner],
      },
      {
        id: final,
        kind: 'inference',
        blockId: null,
        formula: '!P -> (Q -> !P)',
        ruleId: 'implication_introduction',
        lineReferences: [],
        subproofReferences: [outer],
      },
    ],
    blocks: [
      { id: outer, assumptionId: assumption, parentId: null, endId: ending },
      { id: inner, assumptionId: nested, parentId: outer, endId: nested },
    ],
  };
}

const rules = [{ id: 'implication_introduction', label: 'Conditional proof' }];

test('read-only summaries show notation, nested scopes and numbered subproof citations without implying correctness', async () => {
  const proof = fixture();
  const original = structuredClone(proof);
  render(<FitchProofSummary proof={proof} rules={rules} label="Submitted proof" />);
  await userEvent.setup().click(screen.getByText('Submitted proof'));
  const display = screen.getByRole('region', { name: 'Submitted proof diagram' });
  expect(within(display).getByText('¬P → (Q → ¬P)')).toBeInTheDocument();
  expect(within(display).getByText('Conditional proof · subproof 2–2')).toBeInTheDocument();
  expect(within(display).getByText('Conditional proof · subproof 1–3')).toBeInTheDocument();
  expect(within(display).getByText('Inside subproof 1, 2')).toBeInTheDocument();
  expect(display.querySelectorAll('.scope-start')).toHaveLength(2);
  expect(display.querySelectorAll('.scope-end')).toHaveLength(2);
  expect(
    within(display).queryByRole('columnheader', { name: 'Actions', hidden: true }),
  ).not.toBeInTheDocument();
  expect(within(display).queryByRole('button')).not.toBeInTheDocument();
  expect(within(display).queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(proof).toEqual(original);
});

test('read-only mode suppresses supplied edit actions, selection and entry content', () => {
  const proof = fixture();
  const action = vi.fn();
  render(
    <FitchProofDisplay
      proof={proof}
      rules={rules}
      readOnly
      selectedId={proof.steps[0]!.id}
      onEdit={action}
      onMove={action}
      onInsert={action}
      onDelete={action}
      onBlockSettings={action}
      onDeleteBlock={action}
      onCloseBlock={action}
      onReopenBlock={action}
      entry={
        <tr>
          <td>
            <button type="button">SHOULD_NOT_RENDER</button>
          </td>
        </tr>
      }
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByText('SHOULD_NOT_RENDER')).not.toBeInTheDocument();
  expect(document.querySelector('tfoot')).toBeNull();
  expect(document.querySelector('.selected-proof-line')).toBeNull();
  expect(action).not.toHaveBeenCalled();
});

test('missing citations, open endpoints, blank formulas and cyclic scopes remain visible without repair', async () => {
  const proof = fixture();
  proof.blocks[0]!.parentId = proof.blocks[0]!.id;
  proof.blocks[0]!.endId = null;
  const last = proof.steps[3]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.formula = '';
  last.ruleId = 'unavailable_rule';
  last.lineReferences = [crypto.randomUUID()];
  last.subproofReferences.push(crypto.randomUUID());
  const original = structuredClone(proof);
  render(<FitchProofSummary proof={proof} rules={rules} label="Retained draft" />);
  await userEvent.setup().click(screen.getByText('Retained draft'));
  const display = screen.getByRole('region', { name: 'Retained draft diagram' });
  expect(within(display).getByText('(blank)')).toBeInTheDocument();
  expect(display).toHaveTextContent(
    'Unavailable rule · Missing line · subproof starting at line 1 (not closed), Missing subproof',
  );
  expect(within(display).getAllByText('Cyclic subproof scope').length).toBeGreaterThan(0);
  expect(proof).toEqual(original);
});

test.each([null, { proofVersion: 1, format: 'fitch', steps: [], blocks: [] } as FitchProof])(
  'retains the null/empty summary and private child content (%s)',
  async (proof) => {
    render(
      <FitchProofSummary proof={proof} rules={rules} label="Private reference">
        <p>Private explanation</p>
      </FitchProofSummary>,
    );
    await userEvent.setup().click(screen.getByText('Private reference'));
    expect(
      screen.getByText(proof ? 'No proof lines entered.' : 'No proof entered.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Private explanation')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  },
);

test('ambiguous identities keep every retained line in the noninteractive fallback', async () => {
  const proof = fixture();
  proof.steps[1]!.id = proof.steps[0]!.id;
  const original = structuredClone(proof);
  render(<FitchProofSummary proof={proof} rules={rules} label="Ambiguous draft" />);
  await userEvent.setup().click(screen.getByText('Ambiguous draft'));
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(proof).toEqual(original);
});
