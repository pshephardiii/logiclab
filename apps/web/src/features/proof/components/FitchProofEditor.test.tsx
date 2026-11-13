import { lineAction } from '../../../../test/proof-controls';
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

function setup(initial = fixture(), allowedRules = rules) {
  const changed = vi.fn();
  let current = initial;

  function Harness() {
    const [proof, setProof] = useState<FitchProof | null>(initial);
    return (
      <FitchProofEditor
        statement={{ premises: [], rules: allowedRules, conclusion: 'P -> Q' }}
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

  await lineAction(user, 2, 'Edit line 2');
  expect(screen.getByLabelText('Formula for line 2')).toHaveFocus();
  await lineAction(user, 1, 'Edit line 1');
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
  await lineAction(user, 3, 'Edit line 3');

  await lineAction(user, 3, 'Move line 3 up');
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P');
  expect(current().steps[1]).toEqual(added);
  expect(screen.getByLabelText('Line 2 citation 1')).toHaveValue(initial.steps[0]!.id);
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
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
  await lineAction(user, 1, 'Edit line 1');
  await lineAction(user, 1, 'Delete line 1');
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(current().steps).toEqual([last]);
  await lineAction(user, 1, 'Edit line 1');
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P → Q');
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
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
    screen.getByText(
      'Repeat · 1 · subproof starting at line 1 (not closed), 2–2, Missing subproof',
    ),
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
  expect(screen.getByRole('button', { name: 'Actions for line 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Open subproof' })).toBeDisabled();
  fireEvent.keyDown(screen.getByLabelText('Formula for line 3'), {
    key: 'Enter',
    isComposing: true,
  });
  expect(changed).not.toHaveBeenCalled();
  await user.keyboard('{Enter}');
  expect(current().steps).toHaveLength(2);
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), initial.steps[0]!.id);
  await user.click(screen.getByLabelText('Formula for line 3'));
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
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute('data-scope-id', outer.id);
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
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), proof.steps[0]!.id);
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

function nestedProof(): FitchProof {
  const outer = crypto.randomUUID(),
    inner = crypto.randomUUID();
  const first = crypto.randomUUID(),
    second = crypto.randomUUID();
  return {
    proofVersion: 1,
    format: 'fitch',
    steps: [
      { kind: 'assumption', id: first, blockId: outer, formula: 'P' },
      { kind: 'assumption', id: second, blockId: inner, formula: 'Q' },
      {
        kind: 'inference',
        id: crypto.randomUUID(),
        blockId: null,
        formula: 'P -> Q',
        ruleId: 'reiteration',
        lineReferences: [],
        subproofReferences: [outer],
      },
    ],
    blocks: [
      { id: outer, parentId: null, assumptionId: first, endId: null },
      { id: inner, parentId: outer, assumptionId: second, endId: null },
    ],
  };
}

test('closing/reopening a nested subproof changes only its endpoint and active entry scope', async () => {
  const proof = nestedProof();
  const { user, current } = setup(proof);
  await lineAction(user, 2, 'Close subproof at line 2');
  expect(current().blocks[1]!.endId).toBe(proof.steps[1]!.id);
  expect(current().blocks[0]).toEqual(proof.blocks[0]);
  expect(current().steps).toEqual(proof.steps);
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute(
    'data-scope-id',
    proof.blocks[0]!.id,
  );
  await lineAction(user, 2, 'Reopen subproof at line 2');
  expect(current().blocks).toEqual(proof.blocks);
  expect(current().steps).toEqual(proof.steps);
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute(
    'data-scope-id',
    proof.blocks[1]!.id,
  );
});

test('subproof settings are modal, constrain parent/end choices and retain explicit changes on Escape', async () => {
  const proof = nestedProof();
  const { user, changed, current } = setup(proof);
  expect(screen.queryByRole('dialog', { name: 'Subproof settings' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Parent of Subproof 1 at line 1')).not.toBeInTheDocument();
  await lineAction(user, 1, 'Subproof settings for line 1');
  const dialog = screen.getByRole('dialog', { name: 'Subproof settings' });
  expect(within(dialog).getByRole('heading', { name: 'Subproof settings' })).toHaveFocus();
  expect(changed).not.toHaveBeenCalled();
  expect(
    within(screen.getByLabelText('Parent of Subproof 1 at line 1')).getAllByRole('option'),
  ).toHaveLength(1);
  const end = screen.getByLabelText('Final line of Subproof 1 at line 1');
  expect(
    within(end)
      .getAllByRole('option')
      .map((option) => option.getAttribute('value')),
  ).toEqual(['', proof.steps[0]!.id]);
  await user.selectOptions(end, proof.steps[0]!.id);
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog', { name: 'Subproof settings' })).not.toBeInTheDocument();
  expect(current().blocks[0]!.endId).toBe(proof.steps[0]!.id);
  expect(screen.getByRole('button', { name: 'Actions for line 1' })).toHaveFocus();
});

test('inserting before an assumption uses its parent scope and retains existing identities', async () => {
  const proof = nestedProof();
  const { user, changed, current } = setup(proof);
  await lineAction(user, 2, 'Insert before line 2');
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute(
    'data-scope-id',
    proof.blocks[0]!.id,
  );
  expect(changed).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Formula for line 2'), 'P');
  await user.selectOptions(screen.getByLabelText('Rule for line 2'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 2 citation 1'), proof.steps[0]!.id);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(current().steps[1]!.blockId).toBe(proof.blocks[0]!.id);
  expect(current().steps.filter((_, index) => index !== 1)).toEqual(proof.steps);
  expect(current().blocks).toEqual(proof.blocks);
});

test('subproof deletion uses a modal, retains work on Keep and leaves surviving citations unresolved', async () => {
  const proof = nestedProof();
  const { user, current } = setup(proof);
  await lineAction(user, 1, 'Delete subproof at line 1');
  expect(screen.getByRole('dialog', { name: 'Confirm proof deletion' })).toHaveTextContent(
    'Delete 2 proof line(s)',
  );
  await user.click(screen.getByRole('button', { name: 'Keep proof work' }));
  expect(current()).toEqual(proof);
  await lineAction(user, 1, 'Delete subproof at line 1');
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(current().blocks).toEqual([]);
  expect(current().steps).toEqual([proof.steps[2]]);
  expect(screen.getByRole('region', { name: 'Entered Fitch proof' })).toHaveTextContent(
    'Missing subproof',
  );
});

test('a line deletion confirmation follows its stable identity after an authoritative reorder', async () => {
  const proof = fixture();
  const changed = vi.fn();
  const props = {
    statement: { premises: [], rules },
    purpose: 'student' as const,
    onChange: changed,
  };
  const view = render(<FitchProofEditor {...props} proof={proof} />);
  const user = userEvent.setup();
  await lineAction(user, 1, 'Delete line 1');
  view.rerender(
    <FitchProofEditor {...props} proof={{ ...proof, steps: [...proof.steps].reverse() }} />,
  );
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(changed.mock.calls[0]![0].steps).toEqual([proof.steps[1]]);
});

test('an orphan block remains inspectable and explicitly removable without a matching assumption line', async () => {
  const proof = fixture();
  const id = crypto.randomUUID();
  proof.blocks = [{ id, parentId: null, assumptionId: crypto.randomUUID(), endId: null }];
  const { user, changed, current } = setup(proof);
  await user.click(screen.getByText('Unattached subproofs'));
  await user.click(screen.getByRole('button', { name: 'Settings for Subproof 1 at line ?' }));
  expect(screen.getByRole('dialog', { name: 'Subproof settings' })).toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Delete Subproof 1 at line ?' }));
  expect(screen.getByRole('dialog', { name: 'Confirm proof deletion' })).toHaveTextContent(
    'Delete 0 proof line(s)',
  );
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(current().blocks).toEqual([]);
  expect(current().steps).toEqual(proof.steps);
});

test('explicit Close subproof records the confirmed endpoint, returns to its parent and never closes pending work', async () => {
  const { user, current } = setup();
  expect(screen.queryByLabelText('New line scope')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Current proof scope')).toHaveTextContent('Main proof');
  expect(screen.getByRole('button', { name: 'Close subproof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  expect(screen.getByRole('button', { name: 'Close subproof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 4'), 'Q');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  expect(current().blocks[1]!.endId).toBe(current().steps[3]!.id);
  expect(current().blocks[0]!.endId).toBeNull();
  expect(screen.getByLabelText('Current proof scope')).toHaveTextContent('starting at line 3');
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  expect(current().blocks[0]!.endId).toBe(current().steps[2]!.id);
  expect(screen.getByRole('button', { name: 'Close subproof' })).toBeDisabled();
  await lineAction(user, 3, 'Reopen subproof at line 3');
  expect(screen.getByRole('button', { name: 'Close subproof' })).toBeEnabled();
});

test('citation placeholders identify their purpose and None clears without silently choosing a line', async () => {
  const initial = fixture();
  const { user, current } = setup(initial);
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'reiteration');
  const citation = screen.getByLabelText('Line 3 citation 1');
  expect(citation).toHaveDisplayValue('Line 1');
  expect(within(citation).getByRole('option', { name: 'None' })).toBeInTheDocument();
  await user.selectOptions(citation, initial.steps[0]!.id);
  await user.selectOptions(citation, '');
  expect(citation).toHaveDisplayValue('Line 1');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(screen.getByRole('button', { name: 'Add line' })).toBeDisabled();
  expect(current()).toEqual(initial);
  await user.selectOptions(citation, initial.steps[0]!.id);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(current().steps[2]).toMatchObject({ lineReferences: [initial.steps[0]!.id] });
});

test('range deletion is modal, cancellation retains entries and Escape restores the trigger focus', async () => {
  const initial = fixture();
  const { user, current, changed } = setup(initial);
  const trigger = screen.getByRole('button', { name: 'Select line 2 for deletion' });
  await user.click(screen.getByRole('button', { name: 'Select line 1 for deletion' }));
  await user.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Delete selected lines?' });
  expect(within(dialog).getByRole('button', { name: 'Keep proof work' })).toHaveFocus();
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(current()).toEqual(initial);
  expect(changed).not.toHaveBeenCalled();
});

test('reverse range selection highlights the range, cancels without writes and renumbers retained citations after confirmation', async () => {
  const proof = fixture();
  proof.steps.push(
    ...Array.from({ length: 5 }, () => ({ ...proof.steps[1]!, id: crypto.randomUUID() })),
  );
  const last = proof.steps[6]!;
  if (last.kind !== 'inference') throw new Error();
  last.lineReferences = [proof.steps[4]!.id];
  const { user, current, changed } = setup(proof);
  expect(screen.queryByRole('button', { name: 'Clear proof' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Select line 6 for deletion' }));
  expect(screen.getByRole('status')).toHaveTextContent('Line 6 selected');
  await user.click(screen.getByRole('button', { name: 'Cancel selection' }));
  expect(changed).not.toHaveBeenCalled();
  await lineAction(user, 6, 'Delete a range starting at line 6');
  await user.click(screen.getByRole('button', { name: 'Select line 4 for deletion' }));
  const dialog = screen.getByRole('dialog', { name: 'Delete selected lines?' });
  expect(dialog).toHaveTextContent('Delete lines 4–6?');
  expect(document.querySelectorAll('.selected-proof-range')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Delete selected lines' }));
  expect(current().steps).toEqual([...proof.steps.slice(0, 3), last]);
  expect(current().steps[3]).toMatchObject({ lineReferences: [proof.steps[4]!.id] });
  expect(screen.getByText('Repeat · Missing line')).toBeInTheDocument();
});

test('unconfirmed entry blocks range selection and partial assumption deletion is explained without changing work', async () => {
  const proof = nestedProof();
  const { user, changed } = setup(proof);
  await user.type(screen.getByLabelText('Formula for line 4'), 'R');
  expect(screen.getByRole('button', { name: 'Select line 1 for deletion' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  await user.click(screen.getByRole('button', { name: 'Select line 1 for deletion' }));
  await user.click(screen.getByRole('button', { name: 'Select line 1 for deletion' }));
  expect(screen.getByRole('alert')).toHaveTextContent('entire subproof');
  expect(screen.getByRole('button', { name: 'Delete selected lines' })).toBeDisabled();
  expect(changed).not.toHaveBeenCalled();
});

test('visible Reopen reverses the latest closure and the next confirmed line continues inside the same block', async () => {
  const { user, current } = setup();
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  const open = structuredClone(current());
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  expect(screen.getByLabelText('Current proof scope')).toHaveTextContent('Main proof');
  expect(current().blocks[0]!.endId).toBe(open.steps[2]!.id);
  await user.click(screen.getByRole('button', { name: 'Reopen subproof' }));
  expect(current()).toEqual(open);
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute(
    'data-scope-id',
    open.blocks[0]!.id,
  );
  expect(screen.getByLabelText('Formula for line 4')).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Reopen subproof' })).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 4'), 'Q');
  await user.selectOptions(screen.getByLabelText('Rule for line 4'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 4 citation 1'), current().steps[0]!.id);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(current().steps[3]!.blockId).toBe(open.blocks[0]!.id);
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  expect(current().blocks[0]!.endId).toBe(current().steps[3]!.id);
});

test('nested Reopen targets only the just-closed child and cannot discard an unconfirmed entry', async () => {
  const proof = nestedProof();
  const { user, current } = setup(proof);
  // Explicit continuation remains available; append also resumes the open inner scope.
  await lineAction(user, 2, 'Continue subproof at line 2');
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  await user.type(screen.getByLabelText('Formula for line 4'), 'R');
  expect(screen.getByRole('button', { name: 'Reopen subproof' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  await user.click(screen.getByRole('button', { name: 'Reopen subproof' }));
  expect(current().blocks).toEqual(proof.blocks);
  expect(current().steps).toEqual(proof.steps);
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute(
    'data-scope-id',
    proof.blocks[1]!.id,
  );
});

test('quick Reopen disappears after a new confirmed line rather than undoing later work', async () => {
  const { user, current } = setup();
  await user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await user.type(screen.getByLabelText('Formula for line 3'), 'P');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  await user.type(screen.getByLabelText('Formula for line 4'), 'Q');
  await user.selectOptions(screen.getByLabelText('Rule for line 4'), 'reiteration');
  await user.selectOptions(screen.getByLabelText('Line 4 citation 1'), current().steps[0]!.id);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(screen.queryByRole('button', { name: 'Reopen subproof' })).not.toBeInTheDocument();
  expect(current().blocks[0]!.endId).toBe(current().steps[2]!.id);
  await lineAction(user, 3, 'Reopen subproof at line 3');
  expect(current().blocks[0]!.endId).toBeNull();
});

test('Add line waits for the rule and every citation, retaining a second-slot-first selection and ignoring incomplete Enter', async () => {
  const proof = fixture();
  const allowed = [...rules, { id: 'and_introduction', label: 'And intro' }];
  const { user, current, changed } = setup(proof, allowed);
  const add = screen.getByRole('button', { name: 'Add line' });
  expect(add).toBeDisabled();
  await user.type(screen.getByLabelText('Formula for line 3'), 'Q');
  await user.keyboard('{Enter}');
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByText('Choose a rule.')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'and_introduction');
  await user.selectOptions(screen.getByLabelText('Line 3 citation 2'), proof.steps[1]!.id);
  expect(screen.getByLabelText('Line 3 citation 1')).toHaveDisplayValue('Line 1');
  expect(screen.getByLabelText('Line 3 citation 2')).toHaveValue(proof.steps[1]!.id);
  expect(add).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), proof.steps[0]!.id);
  expect(add).toBeEnabled();
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), '');
  expect(add).toBeDisabled();
  expect(screen.getByLabelText('Line 3 citation 2')).toHaveValue(proof.steps[1]!.id);
  await user.selectOptions(screen.getByLabelText('Line 3 citation 1'), proof.steps[0]!.id);
  await user.click(add);
  expect(current().steps[2]).toMatchObject({
    formula: 'Q',
    lineReferences: [proof.steps[0]!.id, proof.steps[1]!.id],
  });
});

test('Add line handles a zero-input rule and closed-subproof citations without requiring irrelevant fields', async () => {
  const proof = fixture();
  proof.blocks = [
    {
      id: crypto.randomUUID(),
      parentId: null,
      assumptionId: proof.steps[0]!.id,
      endId: proof.steps[0]!.id,
    },
  ];
  const allowed = [
    ...rules,
    { id: 'excluded_middle', label: 'Excluded middle' },
    { id: 'implication_introduction', label: 'Conditional proof' },
  ];
  const { user, current } = setup(proof, allowed);
  await user.type(screen.getByLabelText('Formula for line 3'), 'P -> P');
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'implication_introduction');
  expect(screen.getByRole('button', { name: 'Add line' })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Line 3 subproof 1'), proof.blocks[0]!.id);
  expect(screen.getByRole('button', { name: 'Add line' })).toBeEnabled();
  await user.selectOptions(screen.getByLabelText('Rule for line 3'), 'excluded_middle');
  expect(screen.getByRole('button', { name: 'Add line' })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Line 3 subproof 1'), '');
  expect(screen.getByRole('button', { name: 'Add line' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(current().steps[2]).toMatchObject({
    ruleId: 'excluded_middle',
    lineReferences: [],
    subproofReferences: [],
  });
});

test('returning from insertion resumes the innermost open subproof until each scope is closed', async () => {
  const proof = nestedProof();
  const { user, current } = setup(proof, [{ id: 'excluded_middle', label: 'Excluded middle' }]);
  const [outer, inner] = proof.blocks;
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute('data-scope-id', inner!.id);
  await lineAction(user, 1, 'Continue subproof at line 1');
  expect(screen.getByRole('alert')).toHaveTextContent('Close the innermost open subproof');
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute('data-scope-id', inner!.id);
  // Earlier insertion is still available for deliberate repairs, but cannot change append context.
  await lineAction(user, 1, 'Insert before line 1');
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute('data-scope-id', '');
  await user.click(screen.getByRole('button', { name: 'Append at end instead' }));
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute('data-scope-id', inner!.id);
  await user.type(screen.getByLabelText('Formula for line 4'), 'P v !P');
  await user.selectOptions(screen.getByLabelText('Rule for line 4'), 'excluded_middle');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(current().steps.at(-1)!.blockId).toBe(inner!.id);
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute('data-scope-id', outer!.id);
  await user.click(screen.getByRole('button', { name: 'Close subproof' }));
  expect(screen.getByLabelText('Current proof scope')).toHaveAttribute('data-scope-id', '');
  await user.type(screen.getByLabelText('Formula for line 5'), 'P v !P');
  await user.selectOptions(screen.getByLabelText('Rule for line 5'), 'excluded_middle');
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(current().steps.at(-1)!.blockId).toBeNull();
});
