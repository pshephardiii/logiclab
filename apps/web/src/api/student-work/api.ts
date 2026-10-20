import {
  studentAssignmentListResponseSchema,
  studentAssignmentResponseSchema,
  studentAttemptResponseSchema,
  studentSolutionResponseSchema,
  type SaveStudentAnswers,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

/** Bind resource operations to a supplied account request transport. */
export function createApi(request: typeof requestAccountJson = requestAccountJson) {
  const fallback = 'Could not load or save assigned work. Please try again.';
  function listAssignedWork(classId: string, offset: number, signal: AbortSignal) {
    return request(`/api/student/classes/${classId}/assignments?offset=${offset}`, {
      schema: studentAssignmentListResponseSchema,
      fallback,
      signal,
    });
  }
  function readAssignedWork(id: string, signal: AbortSignal) {
    return request(`/api/student/assignments/${id}`, {
      schema: studentAssignmentResponseSchema,
      fallback,
      signal,
    });
  }
  async function saveAssignedAnswers(id: string, input: SaveStudentAnswers, signal: AbortSignal) {
    return (
      await request(`/api/student/assignments/${id}/attempt`, {
        schema: studentAttemptResponseSchema,
        fallback,
        signal,
        method: 'PATCH',
        body: input,
      })
    ).attempt;
  }
  async function submitAssignedWork(id: string, revision: number, signal: AbortSignal) {
    return (
      await request(`/api/student/assignments/${id}/submission`, {
        schema: studentAttemptResponseSchema,
        fallback,
        signal,
        body: { revision },
      })
    ).attempt;
  }
  async function readAssignedSolution(id: string, itemId: string, signal: AbortSignal) {
    return (
      await request(`/api/student/assignments/${id}/items/${itemId}/solution`, {
        schema: studentSolutionResponseSchema,
        fallback,
        signal,
      })
    ).solution;
  }

  return {
    listAssignedWork,
    readAssignedWork,
    saveAssignedAnswers,
    submitAssignedWork,
    readAssignedSolution,
  };
}

export const {
  listAssignedWork,
  readAssignedWork,
  saveAssignedAnswers,
  submitAssignedWork,
  readAssignedSolution,
} = createApi();
