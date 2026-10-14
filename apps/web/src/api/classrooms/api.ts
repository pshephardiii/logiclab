import {
  invitationResponseSchema,
  classroomListResponseSchema,
  classroomResponseSchema,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

const classRequestOptions = { fallback: 'Could not load classes. Please try again.' };

export async function listClassrooms(signal: AbortSignal, offset = 0) {
  const response = await requestAccountJson(`/api/classes?offset=${offset}`, {
    schema: classroomListResponseSchema,
    ...classRequestOptions,
    signal,
  });
  return response;
}

export async function createClassroom(name: string, signal: AbortSignal) {
  const response = await requestAccountJson('/api/classes', {
    schema: classroomResponseSchema,
    ...classRequestOptions,
    signal,
    body: { name },
  });
  return response.classroom;
}

export async function replaceInvitation(classId: string, signal: AbortSignal) {
  const response = await requestAccountJson(`/api/classes/${classId}/invitation`, {
    schema: invitationResponseSchema,
    signal,
    body: {},
    fallback: 'Could not create the invitation. Please try again.',
  });
  return response.invitation;
}
