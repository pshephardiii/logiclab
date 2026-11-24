import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { FormulaForm } from './FormulaForm';

afterEach(() => vi.useRealTimers());

test.each(['P & Q -> R', 'P ∧ Q → R', 'P v Q -> R v S'])(
  '%s shows the grouping error and cannot submit until explicitly grouped',
  (formula) => {
    vi.useFakeTimers();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const props = {
      formula,
      loading: false,
      error: null,
      inputRef: null,
      onFormulaChange: vi.fn(),
      onCreate,
    };
    const view = render(<FormulaForm {...props} />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('status')).toHaveTextContent(/group/);
    const button = screen.getByRole('button', { name: 'Create table' });
    expect(button).toBeDisabled();
    fireEvent.submit(button.closest('form')!);
    expect(onCreate).not.toHaveBeenCalled();
    view.rerender(<FormulaForm {...props} formula="(P & Q) -> R" />);
    expect(button).toBeDisabled();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('status')).toHaveTextContent('Formula is well formed');
    expect(button).toBeEnabled();
    fireEvent.submit(button.closest('form')!);
    expect(onCreate).toHaveBeenCalledOnce();
  },
);

test('typing aliases shows logical symbols and creation receives the same formula', async () => {
  const inputRef = createRef<HTMLInputElement>();
  const create = vi.fn();
  function Harness() {
    const [formula, setFormula] = useState('');
    return (
      <FormulaForm
        formula={formula}
        loading={false}
        error={null}
        inputRef={inputRef}
        onFormulaChange={setFormula}
        onCreate={async () => {
          create(formula);
        }}
      />
    );
  }
  const view = render(<Harness />);
  const user = userEvent.setup();
  const input = screen.getByRole('textbox', { name: 'Propositional formula' });
  expect(inputRef.current).toBe(input);
  await user.type(input, '~(P -> Q) ^ (R v V)');
  expect(input).toHaveValue('¬(P → Q) ∧ (R ∨ V)');
  expect(create).not.toHaveBeenCalled();
  await user.clear(input);
  await user.type(input, 'P <-> Q');
  expect(input).toHaveValue('P ↔ Q');
  const button = screen.getByRole('button', { name: 'Create table' });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
  expect(create).toHaveBeenCalledExactlyOnceWith('P ↔ Q');
  view.unmount();
  expect(inputRef.current).toBeNull();
});

test('shows keyboard equivalents and associates debounced syntax feedback with the input', () => {
  vi.useFakeTimers();
  const create = vi.fn().mockResolvedValue(undefined);
  const props = {
    formula: 'P &',
    loading: false,
    error: null,
    inputRef: null,
    onFormulaChange: vi.fn(),
    onCreate: create,
  };
  const view = render(<FormulaForm {...props} />);
  expect(screen.getByText('v', { selector: 'kbd' })).toBeInTheDocument();
  expect(screen.getByText('->', { selector: 'kbd' })).toBeInTheDocument();
  expect(screen.getByText('<->', { selector: 'kbd' })).toBeInTheDocument();
  expect(screen.getByText('~', { selector: 'kbd' })).toBeInTheDocument();
  expect(screen.getByText('If and only if')).toBeInTheDocument();
  const input = screen.getByRole('textbox', { name: 'Propositional formula' });
  const button = screen.getByRole('button', { name: 'Create table' });
  expect(button).toBeDisabled();
  fireEvent.submit(input.closest('form')!);
  expect(create).not.toHaveBeenCalled();
  expect(input).toHaveAttribute('aria-invalid', 'false');
  act(() => vi.advanceTimersByTime(500));
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(button).toBeDisabled();
  fireEvent.submit(input.closest('form')!);
  expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
  expect(create).not.toHaveBeenCalled();
  view.rerender(<FormulaForm {...props} formula="P v Q" />);
  expect(input).toHaveAttribute('aria-invalid', 'false');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(button).toBeDisabled();
  fireEvent.submit(input.closest('form')!);
  expect(create).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('status')).toHaveTextContent('Formula is well formed');
  expect(button).toBeEnabled();
  fireEvent.submit(input.closest('form')!);
  expect(create).toHaveBeenCalledOnce();
  view.rerender(<FormulaForm {...props} formula="P v Q" loading />);
  expect(button).toBeDisabled();
  fireEvent.submit(input.closest('form')!);
  expect(create).toHaveBeenCalledOnce();
});

test('shows duplicate syntax errors once but preserves distinct request failures', () => {
  vi.useFakeTimers();
  const props = {
    formula: 'P &',
    loading: false,
    error: null as string | null,
    inputRef: null,
    onFormulaChange: vi.fn(),
    onCreate: vi.fn(),
  };
  const view = render(<FormulaForm {...props} />);
  act(() => vi.advanceTimersByTime(500));
  const syntaxError = screen.getByRole('status').textContent!;
  view.rerender(<FormulaForm {...props} error={syntaxError} />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getAllByText(syntaxError)).toHaveLength(1);
  view.rerender(<FormulaForm {...props} error="Unable to reach the practice API." />);
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to reach the practice API.');
});

test('ambiguous biconditional feedback blocks creation until grouping is explicit', () => {
  vi.useFakeTimers();
  const props = {
    formula: 'P <-> Q <-> R',
    loading: false,
    error: null,
    inputRef: null,
    onFormulaChange: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
  };
  const view = render(<FormulaForm {...props} />);
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('status')).toHaveTextContent('Group repeated biconditionals explicitly');
  expect(screen.getByRole('button', { name: 'Create table' })).toBeDisabled();
  view.rerender(<FormulaForm {...props} formula="~[P <-> (Q ↔ R)]" />);
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('status')).toHaveTextContent('Formula is well formed');
  fireEvent.submit(screen.getByRole('textbox', { name: 'Propositional formula' }).closest('form')!);
  expect(props.onCreate).toHaveBeenCalledOnce();
});
