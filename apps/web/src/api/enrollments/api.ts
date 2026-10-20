import { classroomResponseSchema, classroomListResponseSchema } from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

/** Bind resource operations to a supplied account request transport. */
export function createApi(request: typeof requestAccountJson = requestAccountJson) {
  const enrollmentRequestOptions = {
    fallback: 'Could not complete the request. Please try again.',
  };

  async function joinClassroom(code: string, signal: AbortSignal) {
    const response = await request('/api/enrollments', {
      schema: classroomResponseSchema,
      ...enrollmentRequestOptions,
      signal,
      body: { code },
    });
    return response.classroom;
  }

  async function listEnrollments(signal: AbortSignal, offset = 0) {
    const response = await request(`/api/enrollments?offset=${offset}`, {
      schema: classroomListResponseSchema,
      ...enrollmentRequestOptions,
      signal,
    });
    return response;
  }

  return { joinClassroom, listEnrollments };
}

export const { joinClassroom, listEnrollments } = createApi();
