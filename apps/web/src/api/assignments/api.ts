import {
  assignmentResponseSchema,
  assignmentListResponseSchema,
  type CreateAssignmentRequest,
  type UpdateAssignmentRequest,
  type AssignmentListQuery,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

const fallback = 'Could not load or update assignments. Please try again.';

export function listAssignments(
  classId: string,
  archive: AssignmentListQuery['archive'],
  offset: number,
  signal: AbortSignal,
) {
  return requestAccountJson(
    `/api/classes/${classId}/assignments?archive=${archive}&offset=${offset}`,
    { schema: assignmentListResponseSchema, fallback, signal },
  );
}

export async function getAssignment(id: string, signal: AbortSignal) {
  const response = await requestAccountJson(`/api/assignments/${id}`, {
    schema: assignmentResponseSchema,
    fallback,
    signal,
  });
  return response.assignment;
}

export async function createAssignment(
  classId: string,
  input: CreateAssignmentRequest,
  signal: AbortSignal,
) {
  const response = await requestAccountJson(`/api/classes/${classId}/assignments`, {
    schema: assignmentResponseSchema,
    fallback,
    signal,
    body: input,
  });
  return response.assignment;
}

export async function updateAssignment(
  id: string,
  input: UpdateAssignmentRequest,
  signal: AbortSignal,
) {
  const response = await requestAccountJson(`/api/assignments/${id}`, {
    schema: assignmentResponseSchema,
    fallback,
    signal,
    method: 'PATCH',
    body: input,
  });
  return response.assignment;
}

export async function assignmentAction(
  id: string,
  action: 'publish' | 'archive' | 'restore',
  signal: AbortSignal,
) {
  const response = await requestAccountJson(`/api/assignments/${id}/${action}`, {
    schema: assignmentResponseSchema,
    fallback,
    signal,
    body: {},
  });
  return response.assignment;
}
