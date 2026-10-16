import { submissionListResponseSchema, submissionReviewSchema } from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';
const fallback = 'Could not load submissions. Please try again.';
export function listSubmissions(assignmentId: string, offset: number, signal: AbortSignal) {
  return requestAccountJson(`/api/assignments/${assignmentId}/submissions?offset=${offset}`, {
    schema: submissionListResponseSchema,
    fallback,
    signal,
  });
}
export function readSubmission(assignmentId: string, submissionId: string, signal: AbortSignal) {
  return requestAccountJson(`/api/assignments/${assignmentId}/submissions/${submissionId}`, {
    schema: submissionReviewSchema,
    fallback,
    signal,
  });
}
