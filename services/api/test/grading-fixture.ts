import type { SubmissionGradingResponse, SubmissionGradingHistoryEntry } from '@logiclab/contracts';
import { assignmentFixture, assignment } from './assignment-fixture';
import { authUser } from './auth-fixture';
export const submissionId = 'c1111111-1111-4111-8111-111111111111';
export const gradingItemId = assignment.items[0]!.id;
export const initialGrading: SubmissionGradingResponse = {
  grading: { gradingVersion: 'instructor_grading_v1', revision: 0, items: [] },
  score: {
    scoringVersion: 'points_v1',
    items: [{ itemId: gradingItemId, maxPoints: 10, status: 'graded', earnedPoints: 10 }],
    summary: { status: 'graded', maxPoints: 10, earnedPoints: 10, percentage: 100 },
  },
};
export const gradingInput = {
  revision: 0,
  items: [{ itemId: gradingItemId, earnedPoints: 7.5, comment: 'Review the inference.' }],
};
export const updatedGrading: SubmissionGradingResponse = {
  grading: {
    gradingVersion: 'instructor_grading_v1',
    revision: 1,
    items: gradingInput.items.map((item) => ({
      ...item,
      reviewedBy: authUser.id,
      reviewedAt: '2026-11-03T12:00:00.000Z',
    })),
  },
  score: {
    scoringVersion: 'points_v1',
    items: [{ itemId: gradingItemId, maxPoints: 10, status: 'graded', earnedPoints: 7.5 }],
    summary: { status: 'graded', maxPoints: 10, earnedPoints: 7.5, percentage: 75 },
  },
};
export const gradingHistoryEntry: SubmissionGradingHistoryEntry = {
  ...updatedGrading,
  id: 'c2222222-2222-4222-8222-222222222222',
  reviewedBy: authUser.id,
  reviewedAt: '2026-11-03T12:00:00.000Z',
  changes: gradingInput.items,
};
export function gradingFixture() {
  const f = assignmentFixture();
  f.submissionGrading.read.mockResolvedValue(initialGrading);
  f.submissionGrading.update.mockResolvedValue(updatedGrading);
  f.submissionGrading.history.mockResolvedValue({
    revisions: [gradingHistoryEntry],
    nextOffset: null,
  });
  return f;
}
