import { invitationResponseSchema, classroomListResponseSchema, classroomResponseSchema } from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

const classRequestOptions = { fallback: 'Could not load classes. Please try again.' };

export async function listClassrooms(signal: AbortSignal, offset = 0) {
  const payload = await requestAccountJson(`/api/classes?offset=${offset}`, {
    ...classRequestOptions, signal,
  });
  return classroomListResponseSchema.parse(payload);
}

export async function createClassroom(name: string, signal: AbortSignal) {
  const payload = await requestAccountJson('/api/classes', {
    ...classRequestOptions, signal, body: { name },
  });
  return classroomResponseSchema.parse(payload).classroom;
}

export async function replaceInvitation(classId: string, signal: AbortSignal) {
  const payload = await requestAccountJson(`/api/classes/${classId}/invitation`, {
    signal, body: {}, fallback: 'Could not create the invitation. Please try again.',
  });
  return invitationResponseSchema.parse(payload).invitation;
}
