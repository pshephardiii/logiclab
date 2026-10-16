import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import type { AssignmentDetail, ClassroomSummary } from '@logiclab/contracts';
import { useAccountContext } from '../../features/auth/AccountProvider';
import * as api from '../../api/assignments/api';
import { listClassrooms } from '../../api/classrooms/api';
import { listProblems } from '../../api/problems/api';
import { InstructorAssignmentsPage } from './InstructorAssignmentsPage';

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
  render(
    <MemoryRouter>
      <InstructorAssignmentsPage />
    </MemoryRouter>,
  );
  await screen.findByRole('option', { name: 'First class' });
  await user.selectOptions(screen.getByLabelText('Class'), first.id);
  await user.type(screen.getByLabelText('Assignment title'), 'Old class work');
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  const signal = vi.mocked(api.createAssignment).mock.calls[0]![2];
  await user.selectOptions(screen.getByLabelText('Class'), second.id);
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve({
      id: '33333333-3333-4333-8333-333333333333',
      classId: first.id,
      title: 'Old class work',
      instructions: null,
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
      allowSolutions: false,
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
  render(
    <MemoryRouter>
      <InstructorAssignmentsPage />
    </MemoryRouter>,
  );
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
