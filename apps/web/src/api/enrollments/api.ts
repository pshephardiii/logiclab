import { classroomResponseSchema, classroomListResponseSchema } from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

const enrollmentRequestOptions = { fallback: 'Could not complete the request. Please try again.' };

export async function joinClassroom(code: string, signal: AbortSignal) {
  const payload = await requestAccountJson('/api/enrollments', {
    ...enrollmentRequestOptions, signal, body: { code },
  });
  return classroomResponseSchema.parse(payload).classroom;
}

export async function listEnrollments(signal: AbortSignal, offset = 0) {
  const payload = await requestAccountJson(`/api/enrollments?offset=${offset}`, {
    ...enrollmentRequestOptions, signal,
  });
  return classroomListResponseSchema.parse(payload);
}
