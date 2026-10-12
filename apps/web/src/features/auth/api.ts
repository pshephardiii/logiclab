import { authErrorResponseSchema, authMessageResponseSchema, authUserResponseSchema } from '@logiclab/schema';

export type SignedInUser = { id: string; role: 'student' | 'instructor' };
export class AccountApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function request(path: string, signal: AbortSignal, body?: Record<string, string>) {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/auth/${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', signal,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = authErrorResponseSchema.safeParse(payload);
    throw new AccountApiError(response.status === 404 ? 'Account access is currently unavailable. You can still practice.' : parsed.success ? parsed.data.error.message : 'The request could not be completed. Please try again.', response.status);
  }
  return payload;
}

export async function loadSession(signal: AbortSignal): Promise<SignedInUser | null> {
  try { return authUserResponseSchema.parse(await request('session', signal)).user; }
  catch (error) { if (error instanceof AccountApiError && error.status === 401) return null; throw error; }
}
export async function login(body: Record<string, string>, signal: AbortSignal) {
  return authUserResponseSchema.parse(await request('login', signal, body)).user;
}
export async function accountAction(path: string, body: Record<string, string>, signal: AbortSignal) {
  return authMessageResponseSchema.parse(await request(path, signal, body)).message;
}
