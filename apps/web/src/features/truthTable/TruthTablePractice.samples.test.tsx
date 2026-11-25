import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { installDialogStub } from '../../../test/unsaved-work';
import { PracticeProvider } from './PracticeProvider';
import { TruthTablePractice } from './TruthTablePractice';
import { createExercise, getSolution } from '../../api/truth-tables/api';
import { createTruthTableSample } from '../practice/samples/truth-table';

vi.mock('../../api/truth-tables/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/truth-tables/api')>()),
  createExercise: vi.fn(),
  getSolution: vi.fn(),
}));
installDialogStub();
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  const table = createTruthTableSample().completed;
  vi.mocked(getSolution).mockResolvedValue({
    ...table,
    variables: [...table.variables],
    columns: [...table.columns],
    rows: table.rows.map((row) => ({ id: row.id, values: { ...row.values } })),
  });
  vi.mocked(createExercise).mockResolvedValue({
    ...table,
    variables: [...table.variables],
    columns: [...table.columns],
    rows: table.rows.map((row) => ({
      id: row.id,
      values: Object.fromEntries(
        table.columns
          .filter((column) => column.kind === 'given')
          .map((column) => [column.id, row.values[column.id]!]),
      ),
    })),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalScroll)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

test('one click loads the sample through the existing API; Stay preserves answers and Discard reloads blanks', async () => {
  render(
    <PracticeProvider>
      <TruthTablePractice />
    </PracticeProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  await screen.findByRole('button', { name: 'View completed example' });
  expect(createExercise).toHaveBeenLastCalledWith(
    createTruthTableSample().formula,
    expect.any(AbortSignal),
  );
  expect(screen.getByLabelText('Propositional formula')).toHaveValue(
    createTruthTableSample().formula,
  );
  expect(screen.getAllByRole('combobox')).toHaveLength(8);
  expect(
    screen.getAllByRole('combobox').every((field) => (field as HTMLSelectElement).value === ''),
  ).toBe(true);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'T' } });
  const requests = vi.mocked(createExercise).mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getAllByRole('combobox')[0]).toHaveValue('T');
  expect(createExercise).toHaveBeenCalledTimes(requests);
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toHaveValue(''));
  expect(createExercise).toHaveBeenCalledTimes(requests + 1);
});

test('completed table example preserves entries and disappears as a sample action after formula edits', async () => {
  render(
    <PracticeProvider>
      <TruthTablePractice />
    </PracticeProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load sample problem' }));
  await screen.findByRole('button', { name: 'View completed example' });
  fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'F' } });
  fireEvent.click(screen.getByRole('button', { name: 'View completed example' }));
  await screen.findByRole('button', { name: 'Hide completed example' });
  expect(screen.getAllByRole('note')).toHaveLength(8);
  expect(screen.getAllByRole('combobox')[0]).toHaveValue('F');
  expect(screen.getByText('1 / 8 cells filled')).toBeInTheDocument();
  expect(screen.queryByText(/correct ·/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hide completed example' }));
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  expect(screen.getAllByRole('combobox')[0]).toHaveValue('F');
  fireEvent.change(screen.getByLabelText('Propositional formula'), { target: { value: 'R' } });
  expect(screen.queryByRole('button', { name: 'View completed example' })).not.toBeInTheDocument();
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});
