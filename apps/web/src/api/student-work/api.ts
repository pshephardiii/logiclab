import {
  studentAssignmentListResponseSchema,
  studentAssignmentResponseSchema,
  studentAttemptResponseSchema,
  studentSolutionResponseSchema,
  type SaveStudentAnswers,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';
const fallback = 'Could not load or save assigned work. Please try again.';
export function listAssignedWork(classId: string, offset: number, signal: AbortSignal) {
  return requestAccountJson(`/api/student/classes/${classId}/assignments?offset=${offset}`, {
    schema: studentAssignmentListResponseSchema,
    fallback,
    signal,
  });
}
export function readAssignedWork(id: string, signal: AbortSignal) {
  return requestAccountJson(`/api/student/assignments/${id}`, {
    schema: studentAssignmentResponseSchema,
    fallback,
    signal,
  });
}
export async function saveAssignedAnswers(
  id: string,
  input: SaveStudentAnswers,
  signal: AbortSignal,
) {
  return (
    await requestAccountJson(`/api/student/assignments/${id}/attempt`, {
      schema: studentAttemptResponseSchema,
      fallback,
      signal,
      method: 'PATCH',
      body: input,
    })
  ).attempt;
}
export async function submitAssignedWork(id: string, revision: number, signal: AbortSignal) {
  return (
    await requestAccountJson(`/api/student/assignments/${id}/submission`, {
      schema: studentAttemptResponseSchema,
      fallback,
      signal,
      body: { revision },
    })
  ).attempt;
}
export async function readAssignedSolution(id: string, itemId: string, signal: AbortSignal) {
  return (
    await requestAccountJson(`/api/student/assignments/${id}/items/${itemId}/solution`, {
      schema: studentSolutionResponseSchema,
      fallback,
      signal,
    })
  ).solution;
}
