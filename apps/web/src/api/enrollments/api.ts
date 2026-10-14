import { classroomResponseSchema, classroomListResponseSchema } from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

const enrollmentRequestOptions = { fallback: 'Could not complete the request. Please try again.' };

export async function joinClassroom(code: string, signal: AbortSignal) {
  const response = await requestAccountJson('/api/enrollments', {
    schema: classroomResponseSchema,
    ...enrollmentRequestOptions,
    signal,
    body: { code },
  });
  return response.classroom;
}

export async function listEnrollments(signal: AbortSignal, offset = 0) {
  const response = await requestAccountJson(`/api/enrollments?offset=${offset}`, {
    schema: classroomListResponseSchema,
    ...enrollmentRequestOptions,
    signal,
  });
  return response;
}
