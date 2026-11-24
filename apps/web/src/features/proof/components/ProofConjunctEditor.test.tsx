import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { FitchProof, DependencyProof } from '@logiclab/contracts';
import { FitchProofEditor } from './FitchProofEditor';
import { DependencyProofEditor } from '../dependency/DependencyProofEditor';
import { startFitchProof } from '../helpers/fitch-editor';
import { startDependencyProof } from '../dependency/editor';
import { installDialogStub } from '../../../../test/unsaved-work';

installDialogStub();

const statement = {
  ruleCatalogVersion: 2 as const,
  formulaGroupingVersion: 1 as const,
  premises: [
    { id: crypto.randomUUID(), formula: '(P & Q) & R' },
    { id: crypto.randomUUID(), formula: 'P & Q & R' },
  ],
  conclusion: 'Q',
  rules: [
    { id: 'and_chain_elimination', label: 'Conjunct extraction' },
    { id: 'reiteration', label: 'Repeat' },
  ],
};

function setup(format: 'fitch' | 'dependency', inherited = false) {
  const initial =
    format === 'fitch' ? startFitchProof(statement) : startDependencyProof(statement.premises, 2);
  // A premise spelling may omit grouping; the assigned statement still controls its boundaries.
  initial.steps[0]!.formula = 'P & Q & R';
  if (inherited) {
    const base = {
      kind: 'inference' as const,
      id: crypto.randomUUID(),
      formula: 'P & Q & R',
      ruleId: 'reiteration',
      lineReferences: [initial.steps[0]!.id],
    };
    if (initial.format === 'fitch')
      initial.steps.push({ ...base, blockId: null, subproofReferences: [] });
    else initial.steps.push({ ...base, discharges: [], dependencies: [initial.steps[0]!.id] });
  }
  let current = initial;
  function Harness() {
    const [proof, setProof] = useState(initial);
    const change = (next: FitchProof | DependencyProof | null) => {
      if (!next) throw new Error('Unexpected reset');
      current = next;
      setProof(next);
    };
    return proof.format === 'fitch' ? (
      <FitchProofEditor purpose="student" statement={statement} proof={proof} onChange={change} />
    ) : (
      <DependencyProofEditor statement={statement} proof={proof} onChange={change} />
    );
  }
  const view = render(<Harness />);
  return { ...view, initial, current: () => current, line: initial.steps.length + 1 };
}

test.each(['fitch', 'dependency'] as const)(
  '%s requires a meaningful choice but permits a wrong result',
  (format) => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const view = setup(format);
    fireEvent.change(screen.getByLabelText(`Formula for line ${view.line}`), {
      target: { value: 'Z' },
    });
    fireEvent.change(screen.getByLabelText(`Rule for line ${view.line}`), {
      target: { value: 'and_chain_elimination' },
    });
    fireEvent.change(screen.getByLabelText(`Line ${view.line} citation 1`), {
      target: { value: view.initial.steps[0]!.id },
    });
    const choice = screen.getByLabelText(`Conjunct for line ${view.line}`);
    expect(within(choice).getByRole('option', { name: '1. (P ∧ Q)' })).toBeInTheDocument();
    expect(within(choice).queryByRole('option', { name: '3. R' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add line' })).toBeDisabled();
    fireEvent.change(choice, { target: { value: '1' } });
    expect(screen.getByLabelText(`Formula for line ${view.line}`)).toHaveValue('Z');
    expect(screen.getByRole('button', { name: 'Add line' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add line' }));
    expect(view.current().steps.at(-1)).toMatchObject({
      formula: 'Z',
      conjunctIndex: 1,
      ruleId: 'and_chain_elimination',
    });
    expect(screen.getByText(/Conjunct extraction · 1 · conjunct 2/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s clears stale choices when the source or rule changes',
  (format) => {
    const view = setup(format);
    fireEvent.change(screen.getByLabelText(`Formula for line ${view.line}`), {
      target: { value: 'P' },
    });
    const rule = screen.getByLabelText(`Rule for line ${view.line}`);
    fireEvent.change(rule, { target: { value: 'and_chain_elimination' } });
    const citation = screen.getByLabelText(`Line ${view.line} citation 1`);
    fireEvent.change(citation, { target: { value: view.initial.steps[1]!.id } });
    fireEvent.change(screen.getByLabelText(`Conjunct for line ${view.line}`), {
      target: { value: '2' },
    });
    fireEvent.change(citation, { target: { value: view.initial.steps[0]!.id } });
    expect(screen.getByLabelText(`Conjunct for line ${view.line}`)).toHaveValue('__placeholder__');
    expect(screen.getByRole('button', { name: 'Add line' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(`Conjunct for line ${view.line}`), {
      target: { value: '0' },
    });
    fireEvent.change(rule, { target: { value: 'reiteration' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add line' }));
    expect(view.current().steps.at(-1)).not.toHaveProperty('conjunctIndex');
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s choices retain grouping through an earlier rule',
  (format) => {
    const view = setup(format, true);
    fireEvent.change(screen.getByLabelText(`Rule for line ${view.line}`), {
      target: { value: 'and_chain_elimination' },
    });
    fireEvent.change(screen.getByLabelText(`Line ${view.line} citation 1`), {
      target: { value: view.initial.steps[2]!.id },
    });
    const choice = screen.getByLabelText(`Conjunct for line ${view.line}`);
    expect(within(choice).getByRole('option', { name: '1. (P ∧ Q)' })).toBeInTheDocument();
    expect(within(choice).queryByRole('option', { name: '3. R' })).not.toBeInTheDocument();
  },
);
