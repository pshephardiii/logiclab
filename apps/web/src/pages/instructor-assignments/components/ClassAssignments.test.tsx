import * as reviews from '../../../api/submission-review/api';
import { MemoryRouter } from 'react-router';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type {
  AssignmentDetail,
  AssignmentSummary,
  ProblemDraft,
  PublishedProblemVersion,
} from '@logiclab/contracts';
import * as api from '../../../api/assignments/api';
import * as library from '../../../api/problems/api';
import { ClassAssignments } from './ClassAssignments';

vi.mock('../../../api/submission-review/api', () => ({
  listSubmissions: vi.fn(),
  readSubmission: vi.fn(),
}));
vi.mock('../../../api/assignments/api', () => ({
  listAssignments: vi.fn(),
  getAssignment: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  assignmentAction: vi.fn(),
}));
vi.mock('../../../api/problems/api', () => ({ listProblems: vi.fn(), listVersions: vi.fn() }));
const time = '2026-10-16T12:00:00.000Z';
const classId = '11111111-1111-4111-8111-111111111111';
const problem: ProblemDraft = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Library title',
  instructions: null,
  definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  archivedAt: null,
  createdAt: time,
  updatedAt: time,
};
const version: PublishedProblemVersion = {
  id: '33333333-3333-4333-8333-333333333333',
  problemId: problem.id,
  title: 'Original publication',
  instructions: 'Read this snapshot',
  definition: problem.definition,
  version: 1,
  publishedAt: time,
};
const second = {
  ...version,
  id: '44444444-4444-4444-8444-444444444444',
  title: 'Second publication',
  version: 2,
};
const assignment: AssignmentDetail = {
  id: '55555555-5555-4555-8555-555555555555',
  classId,
  title: 'Homework',
  instructions: null,
  assessmentMode: 'graded',
  feedbackTiming: 'on_submission',
  solutionAccess: 'never',
  publishedAt: null,
  archivedAt: null,
  createdAt: time,
  updatedAt: time,
  items: [{ id: '66666666-6666-4666-8666-666666666666', position: 1, problemVersion: version }],
};
const { items, ...summary } = assignment;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(reviews.listSubmissions).mockResolvedValue({ submissions: [], nextOffset: null });
  vi.mocked(api.listAssignments).mockResolvedValue({ assignments: [summary], nextOffset: null });
  vi.mocked(api.getAssignment).mockResolvedValue(assignment);
  vi.mocked(library.listProblems).mockResolvedValue({ problems: [problem], nextOffset: null });
  vi.mocked(library.listVersions).mockResolvedValue({
    versions: [version, second],
    nextOffset: null,
  });
});
async function openDraft() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ClassAssignments classId={classId} />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Homework (draft)' }));
  await screen.findByDisplayValue('Homework');
  return user;
}
async function chooseVersions(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('Library problem'), problem.id);
  await screen.findByRole('button', { name: 'Add version 2' });
}

test('metadata-only edits retain failed input and omit item replacement, then publication locks the form', async () => {
  const user = await openDraft();
  await user.clear(screen.getByLabelText('Assignment title'));
  await user.type(screen.getByLabelText('Assignment title'), 'Revised');
  expect(screen.getByRole('button', { name: 'Publish assignment' })).toBeDisabled();
  vi.mocked(api.updateAssignment).mockRejectedValueOnce(new Error('Save unavailable'));
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save unavailable');
  expect(screen.getByLabelText('Assignment title')).toHaveValue('Revised');
  vi.mocked(api.updateAssignment).mockResolvedValue({ ...assignment, title: 'Revised' });
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Publish assignment' })).toBeEnabled(),
  );
  const input = vi.mocked(api.updateAssignment).mock.calls.at(-1)![1];
  expect(input).toMatchObject({ title: 'Revised', solutionAccess: 'never' });
  expect(input).not.toHaveProperty('problemVersionIds');
  vi.mocked(api.assignmentAction).mockResolvedValue({
    ...assignment,
    title: 'Revised',
    publishedAt: time,
  });
  await user.click(screen.getByRole('button', { name: 'Publish assignment' }));
  await screen.findByRole('heading', { name: 'Saved assignment' });
  expect(screen.getByLabelText('Assignment title')).toBeDisabled();
  expect(screen.getByLabelText('Assessment mode')).toBeDisabled();
  expect(screen.getByLabelText('Solution access')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Publish assignment' })).not.toBeInTheDocument();
});

test('repeated publications are distinct occurrences and ordering/removal controls save the exact list', async () => {
  const user = await openDraft();
  await chooseVersions(user);
  await user.click(screen.getByRole('button', { name: 'Add version 2' }));
  await user.click(screen.getByRole('button', { name: 'Add version 1' }));
  let list = within(screen.getByRole('region', { name: 'Selected assignment problems' }));
  expect(list.getAllByRole('listitem')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Move problem 2 up' }));
  expect(list.getAllByRole('heading')[1]).toHaveTextContent('1. Second publication');
  await user.click(screen.getByRole('button', { name: 'Remove problem 3' }));
  vi.mocked(api.updateAssignment).mockResolvedValue(assignment);
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await waitFor(() =>
    expect(api.updateAssignment).toHaveBeenCalledWith(
      assignment.id,
      expect.objectContaining({ problemVersionIds: [second.id, version.id] }),
      expect.any(AbortSignal),
    ),
  );
});

test('creates a class-scoped empty draft, preserves solution policy, and disables empty publication', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ClassAssignments classId={classId} />
    </MemoryRouter>,
  );
  await user.type(screen.getByLabelText('Assignment title'), 'Empty draft');
  await user.selectOptions(screen.getByLabelText('Solution access'), 'after_submission');
  vi.mocked(api.createAssignment).mockResolvedValue({
    ...assignment,
    title: 'Empty draft',
    solutionAccess: 'after_submission',
    items: [],
  });
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await screen.findByText('Assignment draft saved.');
  expect(api.createAssignment).toHaveBeenCalledWith(
    classId,
    expect.objectContaining({
      title: 'Empty draft',
      solutionAccess: 'after_submission',
      problemVersionIds: [],
    }),
    expect.any(AbortSignal),
  );
  expect(screen.getByRole('button', { name: 'Publish assignment' })).toBeDisabled();
});

test('archive and restore retain publication locks and immutable item content', async () => {
  vi.mocked(api.getAssignment).mockResolvedValue({ ...assignment, publishedAt: time });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ClassAssignments classId={classId} />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Homework (draft)' }));
  await screen.findByRole('heading', { name: 'Saved assignment' });
  vi.mocked(api.assignmentAction)
    .mockResolvedValueOnce({ ...assignment, publishedAt: time, archivedAt: time })
    .mockResolvedValueOnce({ ...assignment, publishedAt: time });
  await user.click(screen.getByRole('button', { name: 'Archive assignment' }));
  await user.click(await screen.findByRole('button', { name: 'Restore assignment' }));
  await screen.findByRole('button', { name: 'Archive assignment' });
  expect(screen.getByLabelText('Assignment title')).toBeDisabled();
  expect(screen.getByLabelText('Assessment mode')).toBeDisabled();
  expect(screen.getByLabelText('Solution access')).toBeDisabled();
  expect(screen.getByText('Read this snapshot')).toBeInTheDocument();
});

test('failed detail reads offer retry rather than allowing a mistaken create', async () => {
  vi.mocked(api.getAssignment)
    .mockRejectedValueOnce(new Error('Read unavailable'))
    .mockResolvedValueOnce(assignment);
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ClassAssignments classId={classId} />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Homework (draft)' }));
  await screen.findByRole('button', { name: 'Retry assignment' });
  expect(screen.queryByRole('button', { name: 'Save assignment draft' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Retry assignment' }));
  await screen.findByDisplayValue('Homework');
});

test('assignment pagination stops at the last page and filter changes ignore late results', async () => {
  const other: AssignmentSummary = {
    ...summary,
    id: '77777777-7777-4777-8777-777777777777',
    title: 'Other',
  };
  vi.mocked(api.listAssignments)
    .mockResolvedValueOnce({ assignments: [summary], nextOffset: 20 })
    .mockResolvedValueOnce({ assignments: [other], nextOffset: null });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ClassAssignments classId={classId} />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Load more assignments' }));
  await screen.findByRole('button', { name: 'Other (draft)' });
  expect(screen.queryByRole('button', { name: 'Load more assignments' })).not.toBeInTheDocument();
  let resolve!: (page: { assignments: AssignmentSummary[]; nextOffset: null }) => void;
  vi.mocked(api.listAssignments).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await user.click(screen.getByRole('button', { name: 'Reload assignments' }));
  const signal = vi.mocked(api.listAssignments).mock.calls.at(-1)![3];
  vi.mocked(api.listAssignments).mockResolvedValue({ assignments: [], nextOffset: null });
  await user.selectOptions(screen.getByLabelText('Show assignments'), 'archived');
  await screen.findByText('No assignments in this view.');
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ assignments: [summary], nextOffset: null }));
  expect(screen.queryByRole('button', { name: 'Homework (draft)' })).not.toBeInTheDocument();
});

test('mode changes preserve failed input, send complete policies and remain draft-only during rollout', async () => {
  const user = await openDraft();
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'completion_only');
  await user.selectOptions(screen.getByLabelText('Solution access'), 'anytime');
  expect(screen.getByRole('button', { name: 'Publish assignment' })).toBeDisabled();
  vi.mocked(api.updateAssignment).mockRejectedValueOnce(new Error('Save unavailable'));
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save unavailable');
  expect(screen.getByLabelText('Assessment mode')).toHaveValue('completion_only');
  expect(screen.getByLabelText('Solution access')).toHaveValue('anytime');
  vi.mocked(api.updateAssignment).mockResolvedValue({
    ...assignment,
    assessmentMode: 'completion_only',
    feedbackTiming: 'on_check',
    solutionAccess: 'anytime',
  });
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await screen.findByText('Assignment draft saved.');
  expect(api.updateAssignment).toHaveBeenLastCalledWith(
    assignment.id,
    expect.objectContaining({
      assessmentMode: 'completion_only',
      feedbackTiming: 'on_check',
      solutionAccess: 'anytime',
    }),
    expect.any(AbortSignal),
  );
  expect(screen.getByLabelText('Assessment mode')).toHaveValue('completion_only');
  expect(screen.getByRole('button', { name: 'Publish assignment' })).toBeDisabled();
  expect(
    screen.getByText(
      'This learning policy can be saved as a draft. Publishing is not available yet.',
    ),
  ).toBeInTheDocument();
});
