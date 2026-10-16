import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { StudentWorkPage } from './StudentWorkPage';
import { listEnrollments } from '../../api/enrollments/api';
import * as api from '../../api/student-work/api';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { work } from '../../../test/assignment-work-fixture';

vi.mock('../../api/enrollments/api', () => ({ listEnrollments: vi.fn() }));
vi.mock('../../api/student-work/api', () => ({
  listAssignedWork: vi.fn(),
  readAssignedWork: vi.fn(),
}));
vi.mock('../../features/auth/AccountProvider', () => ({ useAccountContext: vi.fn() }));
const classroom = { id: work.classId, name: 'Enrolled logic', createdAt: work.createdAt };
const { items, ...summary } = work;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAccountContext).mockReturnValue({
    user: { id: 'student', role: 'student' },
    busy: false,
  } as ReturnType<typeof useAccountContext>);
  vi.mocked(listEnrollments).mockResolvedValue({ classrooms: [classroom], nextOffset: null });
  vi.mocked(api.listAssignedWork).mockResolvedValue({ assignments: [summary], nextOffset: null });
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: work, attempt: null });
});

test('enrolled classes and assigned work paginate and selecting work loads its saved state', async () => {
  const second = {
    ...classroom,
    id: 'b1111111-1111-4111-8111-111111111111',
    name: 'Second enrolled class',
  };
  vi.mocked(listEnrollments)
    .mockResolvedValueOnce({ classrooms: [classroom], nextOffset: 20 })
    .mockResolvedValueOnce({ classrooms: [second], nextOffset: null });
  vi.mocked(api.listAssignedWork)
    .mockResolvedValueOnce({ assignments: [summary], nextOffset: 20 })
    .mockResolvedValueOnce({
      assignments: [
        { ...summary, id: 'b2222222-2222-4222-8222-222222222222', title: 'Other work' },
      ],
      nextOffset: null,
    });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <StudentWorkPage />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Load more classes' }));
  await user.selectOptions(screen.getByLabelText('Class'), second.id);
  await user.click(await screen.findByRole('button', { name: 'Load more assignments' }));
  await screen.findByRole('button', { name: 'Other work' });
  expect(screen.queryByRole('button', { name: 'Load more assignments' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Assigned logic' }));
  await screen.findByRole('heading', { name: 'Problem 1: First occurrence' });
  expect(api.listAssignedWork).toHaveBeenCalledWith(second.id, 20, expect.any(AbortSignal));
  expect(api.readAssignedWork).toHaveBeenCalledWith(work.id, expect.any(AbortSignal));
});

test('class changes cancel late assignment lists and expose load retries', async () => {
  let resolve!: (value: { assignments: (typeof summary)[]; nextOffset: null }) => void;
  vi.mocked(api.listAssignedWork)
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockRejectedValueOnce(new Error('Work unavailable'))
    .mockResolvedValueOnce({ assignments: [], nextOffset: null });
  const second = {
    ...classroom,
    id: 'b1111111-1111-4111-8111-111111111111',
    name: 'Second enrolled class',
  };
  vi.mocked(listEnrollments).mockResolvedValue({
    classrooms: [classroom, second],
    nextOffset: null,
  });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <StudentWorkPage />
    </MemoryRouter>,
  );
  await screen.findByRole('option', { name: 'Enrolled logic' });
  await user.selectOptions(screen.getByLabelText('Class'), classroom.id);
  const signal = vi.mocked(api.listAssignedWork).mock.calls[0]![2];
  await user.selectOptions(screen.getByLabelText('Class'), second.id);
  expect(signal.aborted).toBe(true);
  await screen.findByRole('alert');
  await act(async () => resolve({ assignments: [summary], nextOffset: null }));
  expect(screen.queryByRole('button', { name: 'Assigned logic' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reload available assignments' }));
  await screen.findByText('No published assignments for this class.');
});
