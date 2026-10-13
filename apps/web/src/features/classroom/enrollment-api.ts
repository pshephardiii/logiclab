import { authErrorResponseSchema, classroomResponseSchema, classroomListResponseSchema } from '@logiclab/contracts';
import { AccountApiError } from '../auth/api';
async function request(signal: AbortSignal, code?: string, offset = 0) {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/enrollments${code === undefined ? `?offset=${offset}` : ''}`, {
    method: code === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal,
    ...(code === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = authErrorResponseSchema.safeParse(payload);
    throw new AccountApiError(parsed.success ? parsed.data.error.message : 'Could not complete the request. Please try again.', response.status);
  }
  return payload;
}
export async function joinClassroom(code: string, signal: AbortSignal) { return classroomResponseSchema.parse(await request(signal, code)).classroom; }
export async function listEnrollments(signal: AbortSignal, offset = 0) { return classroomListResponseSchema.parse(await request(signal, undefined, offset)); }
