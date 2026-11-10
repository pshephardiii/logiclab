import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  expect(screen.getByLabelText('Formula for line 3')).toBeInTheDocument();
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
  expect(screen.getByLabelText('Formula for line 3')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), initial.steps[0]!.id);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  const added = current().steps[2]!;
  await user.click(screen.getByRole('button', { name: 'Edit line 3' }));

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
  await user.click(screen.getByRole('button', { name: 'Edit line 1' }));
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

test('an untouched row is clean; typing stays local until confirmation and supports IME-safe Enter', async () => {
  const initial = fixture();
  const { user, changed, current } = setup(initial);
  expect(changed).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Discard entry' })).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Add premise line at root' }),
  ).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 3'), 'Q &');
  expect(changed).not.toHaveBeenCalled();
  expect(current()).toEqual(initial);
  expect(screen.getByRole('button', { name: 'Edit line 1' })).toBeDisabled();
  expect(screen.getByLabelText('New line scope')).toBeDisabled();
  fireEvent.keyDown(screen.getByLabelText('Formula for line 3'), {
    key: 'Enter',
    isComposing: true,
  });
  expect(changed).not.toHaveBeenCalled();
  await user.keyboard('{Enter}');
  expect(current().steps).toHaveLength(3);
  expect(current().steps[2]!.formula).toBe('Q ∧');
  expect(screen.getByLabelText('Formula for line 4')).toHaveFocus();
  expect(changed).toHaveBeenCalledTimes(1);
});

test('opening an assumption is staged, discarded without a block, and confirmed with its parent scope', async () => {
  const { user, changed, current } = setup();
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  expect(current().blocks).toHaveLength(0);
  expect(changed).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(current().steps).toHaveLength(2);
  expect(current().blocks).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  const outer = current().blocks[0]!;
  expect(outer).toMatchObject({
    parentId: null,
    endId: null,
    assumptionId: current().steps[2]!.id,
  });
  expect(screen.getByLabelText('New line scope')).toHaveValue(outer.id);
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 4'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(current().blocks[1]!.parentId).toBe(outer.id);
  expect(current().steps[3]!.blockId).toBe(current().blocks[1]!.id);
});

test('a stale entry cannot overwrite authoritative work and pending state clears on discard/unmount', async () => {
  const proof = fixture();
  const changed = vi.fn(),
    pending = vi.fn();
  const props = {
    statement: { premises: [], rules },
    purpose: 'student' as const,
    onChange: changed,
    onPendingChange: pending,
  };
  const view = render(<FitchProofEditor {...props} proof={proof} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  expect(pending).toHaveBeenLastCalledWith(true);
  const replacement = structuredClone(proof);
  replacement.steps[0]!.formula = 'R';
  view.rerender(<FitchProofEditor {...props} proof={replacement} />);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(screen.getByRole('alert')).toHaveTextContent('proof changed');
  expect(changed).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(screen.getByLabelText('Formula for line 3')).toHaveValue('');
  await user.type(screen.getByLabelText('Formula for line 3'), 'Q');
  view.rerender(<FitchProofEditor {...props} proof={null} />);
  expect(screen.getByRole('button', { name: 'Start proof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(pending).toHaveBeenLastCalledWith(false);
  view.rerender(<FitchProofEditor {...props} proof={replacement} />);
  await user.type(screen.getByLabelText('Formula for line 3'), 'Q');
  view.unmount();
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(changed).not.toHaveBeenCalled();
});
