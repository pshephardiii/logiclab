import {
  invitationResponseSchema,
  classroomListResponseSchema,
  classroomResponseSchema,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

/** Bind resource operations to a supplied account request transport. */
export function createApi(request: typeof requestAccountJson = requestAccountJson) {
  const classRequestOptions = { fallback: 'Could not load classes. Please try again.' };

  async function listClassrooms(signal: AbortSignal, offset = 0) {
    const response = await request(`/api/classes?offset=${offset}`, {
      schema: classroomListResponseSchema,
      ...classRequestOptions,
      signal,
    });
    return response;
  }

  async function createClassroom(name: string, signal: AbortSignal) {
    const response = await request('/api/classes', {
      schema: classroomResponseSchema,
      ...classRequestOptions,
      signal,
      body: { name },
    });
    return response.classroom;
  }

  async function replaceInvitation(classId: string, signal: AbortSignal) {
    const response = await request(`/api/classes/${classId}/invitation`, {
      schema: invitationResponseSchema,
      signal,
      body: {},
      fallback: 'Could not create the invitation. Please try again.',
    });
    return response.invitation;
  }

  return { listClassrooms, createClassroom, replaceInvitation };
}

export const { listClassrooms, createClassroom, replaceInvitation } = createApi();
