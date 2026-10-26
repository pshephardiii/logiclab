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
  solutionAccess: 'never',
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
    listSubmissions: jest.fn<
      ReturnType<AssignmentStore['listSubmissions']>,
      Parameters<AssignmentStore['listSubmissions']>
    >(async () => []),
    findSubmission: jest.fn<
      ReturnType<AssignmentStore['findSubmission']>,
      Parameters<AssignmentStore['findSubmission']>
    >(async () => {
      throw new Error('No fixture submission');
    }),
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
    duplicate: jest.fn<
      ReturnType<AssignmentStore['duplicate']>,
      Parameters<AssignmentStore['duplicate']>
    >(async () => ({
      ...assignment,
      id: 'a4444444-4444-4444-8444-444444444444',
      title: 'Copy of Conjunction assignment',
    })),
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
