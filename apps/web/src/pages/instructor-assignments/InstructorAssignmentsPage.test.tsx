import { installDialogStub, renderWithUnsavedWork as render } from '../../../test/unsaved-work';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type { AssignmentDetail, ClassroomSummary } from '@logiclab/contracts';
import { useAccountContext } from '../../features/auth/AccountProvider';
import * as api from '../../api/assignments/api';
import { listClassrooms } from '../../api/classrooms/api';
import { listProblems } from '../../api/problems/api';
import { InstructorAssignmentsPage } from './InstructorAssignmentsPage';

installDialogStub();

vi.mock('../../features/auth/AccountProvider', () => ({ useAccountContext: vi.fn() }));
vi.mock('../../api/assignments/api', () => ({
  listAssignments: vi.fn(),
  getAssignment: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  assignmentAction: vi.fn(),
}));
vi.mock('../../api/classrooms/api', () => ({ listClassrooms: vi.fn() }));
vi.mock('../../api/problems/api', () => ({ listProblems: vi.fn(), listVersions: vi.fn() }));
const time = '2026-10-16T12:00:00.000Z';
const first: ClassroomSummary = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'First class',
  createdAt: time,
};
const second: ClassroomSummary = {
  ...first,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Second class',
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAccountContext).mockReturnValue({
    user: { id: 'owner', role: 'instructor' },
    busy: false,
  } as ReturnType<typeof useAccountContext>);
  vi.mocked(listProblems).mockResolvedValue({ problems: [], nextOffset: null });
  vi.mocked(api.listAssignments).mockResolvedValue({ assignments: [], nextOffset: null });
  vi.mocked(listClassrooms).mockResolvedValue({ classrooms: [first, second], nextOffset: null });
});

test('changing classes aborts a pending save and prevents its late result appearing in another class', async () => {
  let resolve!: (value: AssignmentDetail) => void;
  vi.mocked(api.createAssignment).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const user = userEvent.setup();
  render(<InstructorAssignmentsPage />);
  await screen.findByRole('option', { name: 'First class' });
  await user.selectOptions(screen.getByLabelText('Class'), first.id);
  await user.type(screen.getByLabelText('Assignment title'), 'Old class work');
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  const signal = vi.mocked(api.createAssignment).mock.calls[0]![2];
  await user.selectOptions(screen.getByLabelText('Class'), second.id);
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve({
      id: '33333333-3333-4333-8333-333333333333',
      classId: first.id,
      title: 'Old class work',
      instructions: null,
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
      solutionAccess: 'never',
      publishedAt: null,
      archivedAt: null,
      createdAt: time,
      updatedAt: time,
      items: [],
    }),
  );
  expect(screen.getByLabelText('Assignment title')).toHaveValue('');
  expect(screen.queryByText('Assignment draft saved.')).not.toBeInTheDocument();
  expect(api.listAssignments).toHaveBeenLastCalledWith(
    second.id,
    'active',
    0,
    expect.any(AbortSignal),
  );
});

test('owned-class pagination and failure retry expose later class choices', async () => {
  vi.mocked(listClassrooms)
    .mockRejectedValueOnce(new Error('Classes unavailable'))
    .mockResolvedValueOnce({ classrooms: [first], nextOffset: 20 })
    .mockResolvedValueOnce({ classrooms: [second], nextOffset: null });
  const user = userEvent.setup();
  render(<InstructorAssignmentsPage />);
  await user.click(await screen.findByRole('button', { name: 'Retry classes' }));
  await user.click(await screen.findByRole('button', { name: 'Load more classes' }));
  await screen.findByRole('option', { name: 'Second class' });
  expect(screen.queryByRole('button', { name: 'Load more classes' })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Class'), second.id);
  await waitFor(() =>
    expect(api.listAssignments).toHaveBeenCalledWith(
      second.id,
      'active',
      0,
      expect.any(AbortSignal),
    ),
  );
});

const draft: AssignmentDetail = {
  id: '33333333-3333-4333-8333-333333333333',
  classId: first.id,
  title: 'Draft one',
  instructions: null,
  assessmentMode: 'graded',
  feedbackTiming: 'on_submission',
  solutionAccess: 'never',
  publishedAt: null,
  archivedAt: null,
  createdAt: time,
  updatedAt: time,
  items: [],
};
function protectedWork() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

test('instructor drafts protect class changes, new selection and reload; failed saves retain protection', async () => {
  vi.mocked(api.listAssignments).mockResolvedValue({ assignments: [draft], nextOffset: null });
  vi.mocked(api.getAssignment).mockResolvedValue(draft);
  const user = userEvent.setup();
  render(<InstructorAssignmentsPage />);
  await screen.findByRole('option', { name: first.name });
  await user.selectOptions(screen.getByLabelText('Class'), first.id);
  await user.click(await screen.findByRole('button', { name: 'Draft one (draft)' }));
  await screen.findByRole('heading', { name: 'Edit assignment draft' });
  await user.type(screen.getByLabelText('Assignment title'), ' edited');
  expect(protectedWork()).toBe(true);
  expect(screen.getByRole('button', { name: 'Archive assignment' })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Class'), second.id);
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Class')).toHaveValue(first.id);
  expect(screen.getByLabelText('Assignment title')).toHaveValue('Draft one edited');
  await user.click(screen.getByRole('button', { name: 'New assignment' }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Assignment title')).toHaveValue('Draft one edited');
  // List refresh and filters do not replace the editor or discard its edits.
  await user.click(screen.getByRole('button', { name: 'Reload assignments' }));
  await user.selectOptions(screen.getByLabelText('Show assignments'), 'all');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Assignment title')).toHaveValue('Draft one edited');
  vi.mocked(api.updateAssignment).mockRejectedValueOnce(new Error('Save unavailable'));
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await screen.findByRole('alert');
  expect(protectedWork()).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Reload saved assignment' }));
  expect(api.getAssignment).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  await screen.findByRole('heading', { name: 'Edit assignment draft' });
  expect(screen.getByLabelText('Assignment title')).toHaveValue(draft.title);
  await waitFor(() => expect(protectedWork()).toBe(false));
  await user.type(screen.getByLabelText('Assignment title'), ' saved');
  vi.mocked(api.updateAssignment).mockResolvedValue({ ...draft, title: 'Draft one saved' });
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await screen.findByText('Assignment draft saved.');
  await waitFor(() => expect(protectedWork()).toBe(false));
});

test.each(['publishedAt', 'archivedAt'] as const)(
  '%s assignments stay read-only without an unsaved warning',
  async (field) => {
    const locked = { ...draft, [field]: time };
    vi.mocked(api.listAssignments).mockResolvedValue({ assignments: [locked], nextOffset: null });
    vi.mocked(api.getAssignment).mockResolvedValue(locked);
    const user = userEvent.setup();
    render(<InstructorAssignmentsPage />);
    await screen.findByRole('option', { name: first.name });
    await user.selectOptions(screen.getByLabelText('Class'), first.id);
    await user.click(
      await screen.findByRole('button', {
        name: field === 'publishedAt' ? 'Draft one (published)' : 'Draft one (archived)',
      }),
    );
    await screen.findByRole('heading', { name: 'Saved assignment' });
    expect(screen.getByLabelText('Assignment title')).toBeDisabled();
    expect(protectedWork()).toBe(false);
    await user.click(screen.getByRole('button', { name: 'New assignment' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  },
);
