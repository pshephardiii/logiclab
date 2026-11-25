import type { ReactNode } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork } from '../../../test/unsaved-work';
import { TruthTreePracticePage } from './TruthTreePracticePage';

vi.mock('../../components/layout/Page', () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
installDialogStub();

test('tree sample loads initial sources without expansions, a verdict or automatic checking', () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected request'));
  renderWithUnsavedWork(<TruthTreePracticePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Truth-tree statement' })).toHaveTextContent('P → Q');
  expect(screen.getByRole('region', { name: 'Truth tree' })).toHaveTextContent('¬Q');
  expect(screen.getAllByRole('button', { name: /^Add step to branch/ })).toHaveLength(1);
  expect(screen.getByRole('radio', { name: 'Valid' })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: 'Invalid' })).not.toBeChecked();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});

test('pending setup survives Stay and is discarded before sample creation', () => {
  renderWithUnsavedWork(<TruthTreePracticePage />);
  fireEvent.change(screen.getByLabelText('New premise'), { target: { value: 'R' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('New premise')).toHaveValue('R');
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.getByRole('button', { name: 'Check tree' })).toBeEnabled();
  expect(screen.queryByLabelText('New premise')).not.toBeInTheDocument();
});

test('reload clears tree feedback, verdict and pending construction only on Discard', () => {
  renderWithUnsavedWork(<TruthTreePracticePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Invalid' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Source formula')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Invalid' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.queryByLabelText('Source formula')).not.toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Invalid' })).not.toBeChecked();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check tree' })).toBeEnabled();
});
