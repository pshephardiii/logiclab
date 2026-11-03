import type { SubmissionListQuery, SubmissionSummary, SubmissionReview } from '@logiclab/contracts';
import type {
  UpdateSubmissionGrading,
  SubmissionGradingResponse,
  SubmissionGradingHistory,
} from '@logiclab/contracts';

export interface SubmissionGradingStore {
  read(
    ownerId: string,
    assignmentId: string,
    submissionId: string,
  ): Promise<SubmissionGradingResponse>;
  update(
    ownerId: string,
    assignmentId: string,
    submissionId: string,
    input: UpdateSubmissionGrading,
  ): Promise<SubmissionGradingResponse>;
  history(
    ownerId: string,
    assignmentId: string,
    submissionId: string,
    query: SubmissionListQuery,
  ): Promise<SubmissionGradingHistory>;
}

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
