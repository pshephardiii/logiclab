import {
  submissionListResponseSchema,
  submissionReviewSchema,
  submissionGradingResponseSchema,
  submissionGradingHistorySchema,
  type UpdateSubmissionGrading,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

/** Bind resource operations to a supplied account request transport. */
export function createApi(request: typeof requestAccountJson = requestAccountJson) {
  const fallback = 'Could not load submissions. Please try again.';
  function listSubmissions(assignmentId: string, offset: number, signal: AbortSignal) {
    return request(`/api/assignments/${assignmentId}/submissions?offset=${offset}`, {
      schema: submissionListResponseSchema,
      fallback,
      signal,
    });
  }
  function readSubmission(assignmentId: string, submissionId: string, signal: AbortSignal) {
    return request(`/api/assignments/${assignmentId}/submissions/${submissionId}`, {
      schema: submissionReviewSchema,
      fallback,
      signal,
    });
  }

  function readGrading(assignmentId: string, submissionId: string, signal: AbortSignal) {
    return request(`/api/assignments/${assignmentId}/submissions/${submissionId}/grading`, {
      schema: submissionGradingResponseSchema,
      fallback,
      signal,
    });
  }
  function saveGrading(
    assignmentId: string,
    submissionId: string,
    input: UpdateSubmissionGrading,
    signal: AbortSignal,
  ) {
    return request(`/api/assignments/${assignmentId}/submissions/${submissionId}/grading`, {
      schema: submissionGradingResponseSchema,
      fallback: 'Could not confirm the grading save. Reload current grading before saving again.',
      signal,
      method: 'PATCH',
      body: input,
    });
  }
  function readGradingHistory(
    assignmentId: string,
    submissionId: string,
    offset: number,
    signal: AbortSignal,
  ) {
    return request(
      `/api/assignments/${assignmentId}/submissions/${submissionId}/grading/history?offset=${offset}`,
      {
        schema: submissionGradingHistorySchema,
        fallback: 'Could not load grading history. Please try again.',
        signal,
      },
    );
  }
  return { listSubmissions, readSubmission, readGrading, saveGrading, readGradingHistory };
}

export const { listSubmissions, readSubmission, readGrading, saveGrading, readGradingHistory } =
  createApi();
