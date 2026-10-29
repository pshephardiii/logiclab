import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { FormulaForm } from './FormulaForm';

afterEach(() => vi.useRealTimers());

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
