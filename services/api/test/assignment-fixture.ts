import type { SubmissionReviewStore } from '../src/persistence/submission-review/store';
import type { AssignmentDetail } from '@logiclab/contracts';
import type { AssignmentStore } from '../src/persistence/assignment/types';
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
    release: jest.fn<
      ReturnType<AssignmentStore['release']>,
      Parameters<AssignmentStore['release']>
    >(async () => assignment),
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
  const submissionReviews = {
    listSubmissions: jest.fn<
      ReturnType<SubmissionReviewStore['listSubmissions']>,
      Parameters<SubmissionReviewStore['listSubmissions']>
    >(async () => []),
    findSubmission: jest.fn<
      ReturnType<SubmissionReviewStore['findSubmission']>,
      Parameters<SubmissionReviewStore['findSubmission']>
    >(async () => {
      throw new Error('No fixture submission');
    }),
  };
  const context: AssignmentContext = { ...auth.context, assignments, submissionReviews };
  return { ...auth, context, assignments, submissionReviews, user: authUser };
}
