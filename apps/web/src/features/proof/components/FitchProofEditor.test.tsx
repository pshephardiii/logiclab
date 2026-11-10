import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { FitchProof } from '@logiclab/contracts';
import { FitchProofEditor } from './FitchProofEditor';
import { FitchProofDisplay } from './FitchProofDisplay';
import { installDialogStub } from '../../../../test/unsaved-work';

installDialogStub();

function fixture(): FitchProof {
  return {
    proofVersion: 1,
    format: 'fitch',
    blocks: [],
    steps: [
      {
        id: crypto.randomUUID(),
        kind: 'premise',
        blockId: null,
        formula: 'P -> Q',
        premiseId: crypto.randomUUID(),
      },
      {
        id: crypto.randomUUID(),
        kind: 'inference',
        blockId: null,
        formula: 'P -> Q',
        ruleId: 'reiteration',
        lineReferences: [],
        subproofReferences: [],
      },
    ],
  };
}

const rules = [{ id: 'reiteration', label: 'Repeat' }];

function setup(initial = fixture()) {
  const changed = vi.fn();
  let current = initial;

  function Harness() {
    const [proof, setProof] = useState<FitchProof | null>(initial);
    return (
      <FitchProofEditor
        statement={{ premises: [], rules, conclusion: 'P -> Q' }}
        proof={proof}
        purpose="student"
        onChange={(next) => {
          changed(next);
          if (next) current = next;
          setProof(next);
        }}
      />
    );
  }

  render(<Harness />);
  return { user: userEvent.setup(), changed, current: () => current };
}

test('shows the whole proof but edits one selected line without changing work on selection', async () => {
  const { user, changed } = setup();
  const display = screen.getByRole('region', { name: 'Entered Fitch proof' });
  expect(within(display).getAllByText('P → Q')).toHaveLength(2);
  expect(screen.getByLabelText('Formula for line 2')).toBeInTheDocument();
  expect(screen.queryByLabelText('Formula for line 1')).not.toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Edit line 2' }));
  expect(screen.getByLabelText('Formula for line 2')).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
  expect(screen.getByLabelText('Formula for line 1')).toHaveFocus();
  expect(screen.queryByLabelText('Formula for line 2')).not.toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();
});

test('adding selects the new line and movement retains its identity and citations', async () => {
  const initial = fixture();
  const { user, current } = setup(initial);
  await user.click(screen.getByRole('button', { name: 'Add inference line' }));
  expect(screen.getByLabelText('Formula for line 3')).toHaveFocus();
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), initial.steps[0]!.id);
  const added = current().steps[2]!;

  await user.click(screen.getByRole('button', { name: 'Move line 3 up' }));
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P');
  expect(current().steps[1]).toEqual(added);
  expect(screen.getByLabelText('Line 2 citation 1')).toHaveValue(initial.steps[0]!.id);
  expect(
    within(screen.getByRole('region', { name: 'Entered Fitch proof' })).getByText('Repeat · 1'),
  ).toBeInTheDocument();
});

test('selected source deletion keeps incoming references visibly missing', async () => {
  const initial = fixture();
  const last = initial.steps[1]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.lineReferences = [initial.steps[0]!.id];
  const { user, current } = setup(initial);
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
  await user.click(screen.getByRole('button', { name: 'Delete line 1' }));
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(current().steps).toEqual([last]);
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P → Q');
  expect(
    within(screen.getByRole('region', { name: 'Entered Fitch proof' })).getByText(
      'Repeat · Missing line',
    ),
  ).toBeInTheDocument();
});

test('nested display marks actual assumption/end lines and open subproof references', () => {
  const proof = fixture();
  const outer = crypto.randomUUID(),
    inner = crypto.randomUUID();
  const first = proof.steps[0]!,
    second = proof.steps[1]!;
  proof.steps = [
    { kind: 'assumption', id: first.id, blockId: outer, formula: 'P' },
    { kind: 'assumption', id: second.id, blockId: inner, formula: 'Q' },
    {
      kind: 'inference',
      id: crypto.randomUUID(),
      blockId: null,
      formula: 'P -> Q',
      ruleId: 'reiteration',
      lineReferences: [first.id],
      subproofReferences: [outer, inner, crypto.randomUUID()],
    },
  ];
  proof.blocks = [
    { id: outer, parentId: null, assumptionId: first.id, endId: null },
    { id: inner, parentId: outer, assumptionId: second.id, endId: second.id },
  ];
  const original = structuredClone(proof);
  render(<FitchProofDisplay proof={proof} rules={rules} selectedId={null} onEdit={vi.fn()} />);
  expect(
    screen.getByText('Repeat · 1 · subproof 1–open, 2–2, Missing subproof'),
  ).toBeInTheDocument();
  expect(screen.getByText('Inside subproof 1, 2')).toBeInTheDocument();
  expect(document.querySelectorAll('.scope-start')).toHaveLength(2);
  expect(document.querySelectorAll('.scope-end')).toHaveLength(1);
  expect(proof).toEqual(original);
});

test('missing and cyclic entered scopes stay inspectable without hanging or silent repair', () => {
  const proof = fixture();
  const block = crypto.randomUUID();
  proof.steps[0]!.blockId = crypto.randomUUID();
  proof.steps[1]!.blockId = block;
  proof.blocks = [{ id: block, parentId: block, assumptionId: proof.steps[1]!.id, endId: null }];
  const original = structuredClone(proof);
  render(<FitchProofDisplay proof={proof} rules={rules} selectedId={null} onEdit={vi.fn()} />);
  expect(screen.getByText('Unavailable subproof')).toBeInTheDocument();
  expect(screen.getByText('Cyclic subproof scope')).toBeInTheDocument();
  expect(proof).toEqual(original);
});
