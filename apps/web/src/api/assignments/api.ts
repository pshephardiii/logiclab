import {
  assignmentResponseSchema,
  assignmentListResponseSchema,
  type CreateAssignmentRequest,
  type UpdateAssignmentRequest,
  type AssignmentListQuery,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

/** Bind resource operations to a supplied account request transport. */
export function createApi(request: typeof requestAccountJson = requestAccountJson) {
  const fallback = 'Could not load or update assignments. Please try again.';

  function listAssignments(
    classId: string,
    archive: AssignmentListQuery['archive'],
    offset: number,
    signal: AbortSignal,
  ) {
    return request(`/api/classes/${classId}/assignments?archive=${archive}&offset=${offset}`, {
      schema: assignmentListResponseSchema,
      fallback,
      signal,
    });
  }

  async function getAssignment(id: string, signal: AbortSignal) {
    const response = await request(`/api/assignments/${id}`, {
      schema: assignmentResponseSchema,
      fallback,
      signal,
    });
    return response.assignment;
  }

  async function createAssignment(
    classId: string,
    input: CreateAssignmentRequest,
    signal: AbortSignal,
  ) {
    const response = await request(`/api/classes/${classId}/assignments`, {
      schema: assignmentResponseSchema,
      fallback,
      signal,
      body: input,
    });
    return response.assignment;
  }

  async function updateAssignment(id: string, input: UpdateAssignmentRequest, signal: AbortSignal) {
    const response = await request(`/api/assignments/${id}`, {
      schema: assignmentResponseSchema,
      fallback,
      signal,
      method: 'PATCH',
      body: input,
    });
    return response.assignment;
  }

  async function assignmentAction(
    id: string,
    action: 'publish' | 'archive' | 'restore',
    signal: AbortSignal,
  ) {
    const response = await request(`/api/assignments/${id}/${action}`, {
      schema: assignmentResponseSchema,
      fallback,
      signal,
      body: {},
    });
    return response.assignment;
  }

  return { listAssignments, getAssignment, createAssignment, updateAssignment, assignmentAction };
}

export const {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  assignmentAction,
} = createApi();
