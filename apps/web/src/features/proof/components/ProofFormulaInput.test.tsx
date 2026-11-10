import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ProofFormulaInput } from './ProofFormulaInput';
import { proofNotation } from '../helpers/proof-notation';

function setup(value = '') {
  const changed = vi.fn();
  function Harness() {
    const [formula, setFormula] = useState(value);
    return (
      <ProofFormulaInput
        aria-label="Formula"
        value={formula}
        onValueChange={(next) => {
          changed(next);
          setFormula(next);
        }}
      />
    );
  }
  render(<Harness />);
  return {
    user: userEvent.setup(),
    changed,
    input: screen.getByLabelText<HTMLInputElement>('Formula'),
  };
}

test('keyboard aliases translate as typed, including partial contradiction and biconditional tokens', async () => {
  const { user, input } = setup();
  await user.type(input, '_|');
  expect(input).toHaveValue('_|');
  await user.type(input, '_');
  expect(input).toHaveValue('⊥');
  await user.clear(input);
  await user.type(input, '~P <-> !(Q v R) & V');
  expect(input).toHaveValue('¬P ↔ ¬(Q ∨ R) ∧ V');
  expect(proofNotation('P -> Q | _|_')).toBe('P → Q ∨ ⊥');
});

test('existing ASCII work displays symbols without changing its data or calling a checker', () => {
  const { input, changed } = setup('P -> !Q');
  expect(input).toHaveValue('P → ¬Q');
  expect(changed).not.toHaveBeenCalled();
});

test('replacement retains a middle-of-formula caret and invalid text instead of repairing it', async () => {
  const { user, input, changed } = setup('P Q');
  await user.click(input);
  input.setSelectionRange(2, 2);
  await user.keyboard('->');
  expect(input).toHaveValue('P →Q');
  expect(input.selectionStart).toBe(3);
  await user.keyboard(' ');
  expect(input).toHaveValue('P → Q');
  expect(changed).toHaveBeenLastCalledWith('P → Q');
  await user.clear(input);
  await user.type(input, 'P &');
  expect(input).toHaveValue('P ∧');
});

test('composition is left intact until the input method finishes', () => {
  const { input } = setup();
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: '~P' } });
  expect(input).toHaveValue('~P');
  fireEvent.compositionEnd(input);
  expect(input).toHaveValue('¬P');
});
