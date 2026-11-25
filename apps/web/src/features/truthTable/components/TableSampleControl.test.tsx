import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { installDialogStub } from '../../../../test/unsaved-work';
import { TableSampleControl } from './TableSampleControl';
import { createTruthTableSample } from '../../practice/samples/truth-table';

installDialogStub();

test('untouched setup loads directly; retained work requires fresh consent on every replacement', () => {
  const onLoad = vi.fn();
  const view = render(<TableSampleControl hasWork={false} onLoad={onLoad} />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  expect(onLoad).toHaveBeenCalledExactlyOnceWith(createTruthTableSample().formula);
  view.rerender(<TableSampleControl hasWork onLoad={onLoad} />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(onLoad).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(onLoad).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  // jsdom does not synthesize native cancel; dispatch it explicitly.
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(onLoad).toHaveBeenCalledTimes(2);
});

test('unmounting a pending sample confirmation cancels the action', () => {
  const onLoad = vi.fn();
  const view = render(<TableSampleControl hasWork onLoad={onLoad} />);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  view.unmount();
  expect(onLoad).not.toHaveBeenCalled();
});
