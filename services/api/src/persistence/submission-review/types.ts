import type { SubmissionListQuery, SubmissionSummary, SubmissionReview } from '@logiclab/contracts';

export interface SubmissionReviewStore {
  listSubmissions(
    ownerId: string,
    assignmentId: string,
    query: SubmissionListQuery,
  ): Promise<SubmissionSummary[]>;
  findSubmission(
    ownerId: string,
    assignmentId: string,
    submissionId: string,
  ): Promise<SubmissionReview>;
}
