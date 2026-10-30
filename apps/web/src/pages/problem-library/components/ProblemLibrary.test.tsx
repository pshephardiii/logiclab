import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type { ProblemDraft, PublishedProblemVersion } from '@logiclab/contracts';
import * as api from '../../../api/problems/api';
import { ProblemLibrary } from './ProblemLibrary';

installDialogStub();

vi.mock('../../../api/problems/api', () => ({
  listProblems: vi.fn(),
  saveProblem: vi.fn(),
  archiveProblem: vi.fn(),
  publishProblem: vi.fn(),
  listVersions: vi.fn(),
  checkReference: vi.fn(),
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
  definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  publishedAt: draft.createdAt,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listProblems).mockResolvedValue({ problems: [draft], nextOffset: null });
  vi.mocked(api.listVersions).mockResolvedValue({ versions: [version], nextOffset: null });
  vi.mocked(api.publishProblem).mockResolvedValue({ ...version, version: 2 });
});
function protectedWork() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

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
  expect(protectedWork()).toBe(true);
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
  await waitFor(() => expect(protectedWork()).toBe(false));
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
  expect(protectedWork()).toBe(false);
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

test.each(['New problem', 'Second problem', 'Conjunction'])(
  '%s asks before replacing a dirty problem draft and leaves it intact on Stay',
  async (selection) => {
    const second = {
      ...draft,
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Second problem',
    };
    vi.mocked(api.listProblems).mockResolvedValue({ problems: [draft, second], nextOffset: null });
    const user = await openDraft();
    await user.type(screen.getByLabelText('Formula'), ' & R');
    await user.click(screen.getByRole('button', { name: selection }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.getByLabelText('Formula')).toHaveValue('P & Q & R');
    // List/filter/preview operations preserve the editor and do not ask to discard.
    await user.click(screen.getByRole('button', { name: 'Reload problems' }));
    await user.selectOptions(screen.getByLabelText('Show problems'), 'all');
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Preview formula: P & Q & R')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: selection }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Formula')).toHaveValue(
      selection === 'New problem' ? '' : 'P & Q',
    );
    expect(screen.queryByText('Preview formula: P & Q & R')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Formula'), 'P');
    await user.click(screen.getByRole('button', { name: 'New problem' }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Stay' }));
  },
);

test('reverting problem edits removes protection without saving', async () => {
  const user = await openDraft();
  await user.type(screen.getByLabelText('Formula'), ' & R');
  expect(protectedWork()).toBe(true);
  await user.clear(screen.getByLabelText('Formula'));
  if (draft.definition.type !== 'truth_table') throw new Error('Expected a truth-table fixture');
  await user.type(screen.getByLabelText('Formula'), draft.definition.formula);
  await waitFor(() => expect(protectedWork()).toBe(false));
  expect(api.saveProblem).not.toHaveBeenCalled();
});

test('new-problem formula save errors are visible in the editor and retain the draft for correction', async () => {
  const user = userEvent.setup();
  const message = 'Expected a variable, negation, or grouped expression (at character 4).';
  vi.mocked(api.saveProblem).mockRejectedValueOnce(new Error(message));
  render(<ProblemLibrary />);
  await user.type(screen.getByLabelText('Title'), 'My new problem');
  await user.type(screen.getByLabelText('Instructions'), 'Keep these instructions');
  await user.type(screen.getByLabelText('Formula'), 'P &');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(message);
  expect(alert.closest('section')).toContainElement(
    screen.getByRole('heading', { name: 'Create a problem' }),
  );
  expect(alert).toHaveFocus();
  expect(screen.getByLabelText('Title')).toHaveValue('My new problem');
  expect(screen.getByLabelText('Instructions')).toHaveValue('Keep these instructions');
  expect(screen.getByLabelText('Formula')).toHaveValue('P &');
  expect(protectedWork()).toBe(true);
  await user.click(screen.getByRole('button', { name: 'New problem' }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  await user.type(screen.getByLabelText('Formula'), ' Q');
  vi.mocked(api.saveProblem).mockResolvedValue({
    ...draft,
    title: 'My new problem',
    instructions: 'Keep these instructions',
  });
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByRole('heading', { name: 'Edit draft' });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('discarding an unsuccessful draft clears its save error for the next editor', async () => {
  const user = await openDraft();
  vi.mocked(api.saveProblem).mockRejectedValueOnce(new Error('Unable to save this draft.'));
  await user.type(screen.getByLabelText('Title'), ' edited');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'New problem' }));
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toHaveValue('');
});

test('conceptual editing participates in discard protection and previews the selected immutable version', async () => {
  const conceptual = {
    ...draft,
    definition: {
      type: 'true_false' as const,
      definitionVersion: 1 as const,
      question: 'Saved question',
      correctAnswer: false,
      explanation: 'Saved explanation',
    },
  };
  vi.mocked(api.listProblems).mockResolvedValue({ problems: [conceptual], nextOffset: null });
  vi.mocked(api.listVersions).mockResolvedValue({
    versions: [{ ...version, definition: conceptual.definition }],
    nextOffset: null,
  });
  const user = await openDraft();
  await user.type(screen.getByLabelText('Question'), ' edited');
  expect(protectedWork()).toBe(true);
  expect(screen.getByRole('button', { name: 'Publish saved draft' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'New problem' }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Question')).toHaveValue('Saved question edited');
  await user.click(screen.getByRole('button', { name: 'Preview version 1' }));
  expect(screen.getByRole('group', { name: 'Saved question' })).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Saved question edited' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Problem preview' }).textContent).not.toContain(
    'Saved explanation',
  );
  await user.click(screen.getByRole('button', { name: 'Show preview answer' }));
  expect(screen.getAllByText(/Saved explanation/).length).toBeGreaterThan(0);
  expect(screen.getByLabelText('Question')).toHaveValue('Saved question edited');
});

test('derivation editing keeps private history previews separate from the draft', async () => {
  const { derivationDraft } = await import('../../../../test/derivation');
  vi.mocked(api.listProblems).mockResolvedValue({ problems: [derivationDraft], nextOffset: null });
  vi.mocked(api.listVersions).mockResolvedValue({
    versions: [
      {
        ...version,
        title: 'Pinned derivation',
        definition: { ...derivationDraft.definition, conclusion: 'Q -> Q' },
      },
    ],
    nextOffset: null,
  });
  const user = userEvent.setup();
  render(<ProblemLibrary />);
  await user.click(await screen.findByRole('button', { name: derivationDraft.title }));
  expect(await screen.findByRole('textbox', { name: 'Conclusion' })).toHaveValue('P -> P');
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(derivationDraft.title);
  expect(screen.queryByRole('textbox', { name: 'Question' })).not.toBeInTheDocument();
  expect(
    await screen.findByRole('heading', { name: 'Version 1: Pinned derivation' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Preview version 1' }));
  expect(screen.getByRole('region', { name: 'Derivation version preview' })).toHaveTextContent(
    'Q -> Q',
  );
  expect(api.saveProblem).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'New problem' }));
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('');
});

test('unsaved derivation edits cancel saved checks, protect selection, and retain fields after failed saves', async () => {
  const { derivationDraft } = await import('../../../../test/derivation');
  vi.mocked(api.listProblems).mockResolvedValue({ problems: [derivationDraft], nextOffset: null });
  vi.mocked(api.listVersions).mockResolvedValue({ versions: [], nextOffset: null });
  vi.mocked(api.checkReference).mockResolvedValue({
    problemId: derivationDraft.id,
    updatedAt: derivationDraft.updatedAt,
    check: { status: 'missing' },
  });
  vi.mocked(api.saveProblem)
    .mockRejectedValueOnce(new Error('Save failed'))
    .mockResolvedValueOnce({
      ...derivationDraft,
      updatedAt: '2026-10-30T12:01:00.000Z',
      definition: { ...derivationDraft.definition, conclusion: 'Q' },
    });
  const user = userEvent.setup();
  render(<ProblemLibrary />);
  await user.click(await screen.findByRole('button', { name: derivationDraft.title }));
  await user.click(await screen.findByRole('button', { name: 'Check saved reference' }));
  await screen.findByRole('status', { name: '' });
  await user.clear(screen.getByLabelText('Conclusion'));
  await user.type(screen.getByLabelText('Conclusion'), 'Q');
  expect(screen.queryByRole('button', { name: 'Check saved reference' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Publish saved draft' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'New problem' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Conclusion')).toHaveValue('Q');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('Q');
  expect(protectedWork()).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(protectedWork()).toBe(false));
  expect(await screen.findByRole('button', { name: 'Check saved reference' })).toBeEnabled();
  expect(
    screen.queryByText('No reference proof saved.', { selector: '[role="status"]' }),
  ).not.toBeInTheDocument();
});
