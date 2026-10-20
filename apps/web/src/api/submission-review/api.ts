import { submissionListResponseSchema, submissionReviewSchema } from '@logiclab/contracts';
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

  return { listSubmissions, readSubmission };
}

export const { listSubmissions, readSubmission } = createApi();
