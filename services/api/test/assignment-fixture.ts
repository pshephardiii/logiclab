import type { AssignmentDetail } from '@logiclab/contracts';
import type { AssignmentStore } from '../src/persistence/assignment/store';
import type { AssignmentContext } from '../src/routes/assignment/context';
import { authFixture, authUser } from './auth-fixture';
import { publishedVersion } from './problem-fixture';

export const classId = 'a1111111-1111-4111-8111-111111111111';
export const assignment: AssignmentDetail = {
  id: 'a2222222-2222-4222-8222-222222222222',
  classId,
  title: 'Conjunction assignment',
  instructions: null,
  assessmentMode: 'graded',
  feedbackTiming: 'on_submission',
  allowSolutions: false,
  publishedAt: null,
  archivedAt: null,
  createdAt: '2026-10-16T12:00:00.000Z',
  updatedAt: '2026-10-16T12:00:00.000Z',
  items: [
    { id: 'a3333333-3333-4333-8333-333333333333', position: 1, problemVersion: publishedVersion },
  ],
};
const { items, ...summary } = assignment;
export const assignmentSummary = summary;
export function assignmentFixture() {
  const auth = authFixture();
  const assignments = {
    create: jest.fn<ReturnType<AssignmentStore['create']>, Parameters<AssignmentStore['create']>>(
      async () => assignment,
    ),
    list: jest.fn<ReturnType<AssignmentStore['list']>, Parameters<AssignmentStore['list']>>(
      async () => [assignmentSummary],
    ),
    findOwned: jest.fn<
      ReturnType<AssignmentStore['findOwned']>,
      Parameters<AssignmentStore['findOwned']>
    >(async () => assignment),
    update: jest.fn<ReturnType<AssignmentStore['update']>, Parameters<AssignmentStore['update']>>(
      async () => assignment,
    ),
    publish: jest.fn<
      ReturnType<AssignmentStore['publish']>,
      Parameters<AssignmentStore['publish']>
    >(async () => ({ ...assignment, publishedAt: assignment.createdAt })),
    setArchived: jest.fn<
      ReturnType<AssignmentStore['setArchived']>,
      Parameters<AssignmentStore['setArchived']>
    >(async () => assignment),
  };
  const context: AssignmentContext = { ...auth.context, assignments };
  return { ...auth, context, assignments, user: authUser };
}
