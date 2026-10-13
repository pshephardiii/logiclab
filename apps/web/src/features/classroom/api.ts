import { authErrorResponseSchema, invitationResponseSchema, classroomListResponseSchema, classroomResponseSchema } from '@logiclab/contracts';
import { AccountApiError } from '../auth/api';

async function request(signal: AbortSignal, name?: string, offset = 0) {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/classes${name === undefined ? `?offset=${offset}` : ''}`, {
    method: name === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal,
    ...(name === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = authErrorResponseSchema.safeParse(payload);
    throw new AccountApiError(parsed.success ? parsed.data.error.message : 'Could not load classes. Please try again.', response.status);
  }
  return payload;
}
export async function listClassrooms(signal: AbortSignal, offset = 0) {
  return classroomListResponseSchema.parse(await request(signal, undefined, offset));
}
export async function createClassroom(name: string, signal: AbortSignal) {
  return classroomResponseSchema.parse(await request(signal, name)).classroom;
}

export async function replaceInvitation(classId: string, signal: AbortSignal) {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/classes/${classId}/invitation`, {
    method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = authErrorResponseSchema.safeParse(payload);
    throw new AccountApiError(parsed.success ? parsed.data.error.message : 'Could not create the invitation. Please try again.', response.status);
  }
  return invitationResponseSchema.parse(payload).invitation;
}
