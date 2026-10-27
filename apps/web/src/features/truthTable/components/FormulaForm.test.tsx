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
  const input = screen.getByRole('textbox', { name: 'Propositional formula' });
  expect(input).toHaveAttribute('aria-invalid', 'false');
  act(() => vi.advanceTimersByTime(500));
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
  expect(create).not.toHaveBeenCalled();
  view.rerender(<FormulaForm {...props} formula="P v Q" />);
  expect(input).toHaveAttribute('aria-invalid', 'false');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('status')).toHaveTextContent('Formula is well formed');
  fireEvent.submit(input.closest('form')!);
  expect(create).toHaveBeenCalledOnce();
});
