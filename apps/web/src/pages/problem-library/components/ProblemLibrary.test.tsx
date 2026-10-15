import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type { ProblemDraft, PublishedProblemVersion } from '@logiclab/contracts';
import * as api from '../../../api/problems/api';
import { ProblemLibrary } from './ProblemLibrary';

vi.mock('../../../api/problems/api', () => ({
  listProblems: vi.fn(),
  saveProblem: vi.fn(),
  archiveProblem: vi.fn(),
  publishProblem: vi.fn(),
  listVersions: vi.fn(),
}));
vi.mock('./ProblemPreview', () => ({
  ProblemPreview: ({ formula }: { formula: string }) => <p>Preview formula: {formula}</p>,
}));
const draft: ProblemDraft = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Conjunction',
  instructions: 'Fill in the table',
  definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
  archivedAt: null,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};
const version: PublishedProblemVersion = {
  id: '22222222-2222-4222-8222-222222222222',
  problemId: draft.id,
  version: 1,
  title: 'Original snapshot',
  instructions: null,
  definition: { ...draft.definition, formula: 'P' },
  publishedAt: draft.createdAt,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listProblems).mockResolvedValue({ problems: [draft], nextOffset: null });
  vi.mocked(api.listVersions).mockResolvedValue({ versions: [version], nextOffset: null });
  vi.mocked(api.publishProblem).mockResolvedValue({ ...version, version: 2 });
});
async function openDraft() {
  const user = userEvent.setup();
  render(<ProblemLibrary />);
  await user.click(await screen.findByRole('button', { name: 'Conjunction' }));
  await screen.findByRole('heading', { name: 'Version 1: Original snapshot' });
  return user;
}

test('failed edits retain input; saving uses the selected ID and publishing uses saved content', async () => {
  const user = await openDraft();
  const title = screen.getByLabelText('Title');
  await user.clear(title);
  await user.type(title, 'Revised');
  expect(screen.getByRole('button', { name: 'Publish saved draft' })).toBeDisabled();
  vi.mocked(api.saveProblem).mockRejectedValueOnce(new Error('Try again'));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again');
  expect(title).toHaveValue('Revised');
  vi.mocked(api.saveProblem).mockResolvedValue({
    ...draft,
    title: 'Revised',
    updatedAt: '2026-10-15T01:00:00.000Z',
  });
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Publish saved draft' })).toBeEnabled(),
  );
  expect(api.saveProblem).toHaveBeenLastCalledWith(
    expect.objectContaining({ title: 'Revised' }),
    expect.any(AbortSignal),
    draft.id,
  );
  await user.click(screen.getByRole('button', { name: 'Publish saved draft' }));
  expect(await screen.findByText('Published version 2.')).toBeInTheDocument();
  expect(api.publishProblem).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Preview version 1' }));
  expect(screen.getByText('Preview formula: P')).toBeInTheDocument();
});

test('archiving preserves history and restoring re-enables editing', async () => {
  const user = await openDraft();
  vi.mocked(api.archiveProblem)
    .mockResolvedValueOnce({
      ...draft,
      archivedAt: draft.createdAt,
      updatedAt: '2026-10-15T01:00:00.000Z',
    })
    .mockResolvedValueOnce({ ...draft, updatedAt: '2026-10-15T02:00:00.000Z' });
  await user.click(screen.getByRole('button', { name: 'Archive problem' }));
  await screen.findByRole('button', { name: 'Restore problem' });
  expect(screen.getByLabelText('Title')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Publish saved draft' })).toBeDisabled();
  expect(screen.getByRole('heading', { name: 'Version 1: Original snapshot' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Restore problem' }));
  await waitFor(() => expect(screen.getByLabelText('Title')).toBeEnabled());
});

test('filter replacement ignores late responses and unmount aborts pending reads', async () => {
  let resolve!: (page: { problems: ProblemDraft[]; nextOffset: null }) => void;
  vi.mocked(api.listProblems).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const user = userEvent.setup();
  const view = render(<ProblemLibrary />);
  const signal = vi.mocked(api.listProblems).mock.calls[0]![2];
  vi.mocked(api.listProblems).mockResolvedValue({ problems: [], nextOffset: null });
  await user.selectOptions(screen.getByLabelText('Show problems'), 'archived');
  await screen.findByText('No problems in this view.');
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ problems: [draft], nextOffset: null }));
  expect(screen.queryByRole('button', { name: 'Conjunction' })).not.toBeInTheDocument();
  const lastSignal = vi.mocked(api.listProblems).mock.calls.at(-1)![2];
  view.unmount();
  expect(lastSignal.aborted).toBe(true);
});

test('publication failures require checking history and never trigger an automatic second publish', async () => {
  const user = await openDraft();
  vi.mocked(api.publishProblem).mockRejectedValue(new Error('Connection lost.'));
  await user.click(screen.getByRole('button', { name: 'Publish saved draft' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Reload history before trying again');
  await user.click(screen.getByRole('button', { name: 'Reload history' }));
  expect(api.publishProblem).toHaveBeenCalledTimes(1);
});

test('new problem resets the editor and saves through the create operation', async () => {
  const user = await openDraft();
  await user.click(screen.getByRole('button', { name: 'New problem' }));
  expect(screen.getByLabelText('Title')).toHaveValue('');
  await user.type(screen.getByLabelText('Title'), 'New exercise');
  await user.type(screen.getByLabelText('Formula'), 'Q');
  vi.mocked(api.saveProblem).mockResolvedValue({ ...draft, title: 'New exercise' });
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() =>
    expect(api.saveProblem).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New exercise', instructions: null }),
      expect.any(AbortSignal),
      undefined,
    ),
  );
});

test('library and version pagination append results and stop on the last page', async () => {
  const second = { ...draft, id: '33333333-3333-4333-8333-333333333333', title: 'Second problem' };
  vi.mocked(api.listProblems)
    .mockResolvedValueOnce({ problems: [draft], nextOffset: 20 })
    .mockResolvedValueOnce({ problems: [second], nextOffset: null });
  vi.mocked(api.listVersions)
    .mockResolvedValueOnce({ versions: [{ ...version, version: 2 }], nextOffset: 20 })
    .mockResolvedValueOnce({ versions: [version], nextOffset: null });
  const user = userEvent.setup();
  render(<ProblemLibrary />);
  await user.click(await screen.findByRole('button', { name: 'Load more problems' }));
  expect(await screen.findByRole('button', { name: 'Second problem' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Conjunction' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Load more problems' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Conjunction' }));
  await user.click(await screen.findByRole('button', { name: 'Load more versions' }));
  expect(
    await screen.findByRole('heading', { name: 'Version 1: Original snapshot' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Version 2: Original snapshot' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Load more versions' })).not.toBeInTheDocument();
});
