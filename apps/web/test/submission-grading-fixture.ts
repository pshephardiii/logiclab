import type { SubmissionGradingResponse, SubmissionGradingHistoryEntry } from '@logiclab/contracts';
import { pointScore } from './assignment-score-fixture';
import { itemA, review } from './assignment-work-fixture';

export const initialGrading: SubmissionGradingResponse = {
  grading: { gradingVersion: 'instructor_grading_v1', revision: 0, items: [] },
  score: pointScore,
};
export const adjustedGrading: SubmissionGradingResponse = {
  grading: {
    gradingVersion: 'instructor_grading_v1',
    revision: 1,
    items: [
      {
        itemId: itemA,
        earnedPoints: 12.25,
        comment: 'Review the justification.',
        reviewedBy: review.submission.student.id,
        reviewedAt: '2026-11-03T12:00:00.000Z',
      },
    ],
  },
  score: {
    ...pointScore,
    items: pointScore.items.map((item) =>
      item.itemId === itemA ? { ...item, status: 'graded', earnedPoints: 12.25 } : item,
    ),
    summary: { status: 'graded', maxPoints: 25, earnedPoints: 12.25, percentage: 49 },
  },
};
export const gradingHistory: SubmissionGradingHistoryEntry = {
  ...adjustedGrading,
  id: 'b1111111-1111-4111-8111-111111111111',
  reviewedBy: adjustedGrading.grading.items[0]!.reviewedBy,
  reviewedAt: adjustedGrading.grading.items[0]!.reviewedAt,
  changes: [{ itemId: itemA, earnedPoints: 12.25, comment: 'Review the justification.' }],
};
