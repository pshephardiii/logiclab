import { requestAccountJson } from '../account-request';
import { AccountApiError } from '../errors';
import type { AuthUserResponse } from '@logiclab/contracts';
import { authMessageResponseSchema, authUserResponseSchema } from '@logiclab/contracts';

export type SignedInUser = AuthUserResponse['user'];

const authRequestOptions = {
  fallback: 'The request could not be completed. Please try again.',
  errorOverride: (status: number) => status === 404
    ? new AccountApiError('Account access is currently unavailable. You can still practice.', status)
    : undefined,
};

export async function loadSession(signal: AbortSignal): Promise<SignedInUser | null> {
  try {
    const payload = await requestAccountJson('/api/auth/session', { ...authRequestOptions, signal });
    return authUserResponseSchema.parse(payload).user;
  } catch (error) {
    if (error instanceof AccountApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(body: Record<string, string>, signal: AbortSignal) {
  const payload = await requestAccountJson('/api/auth/login', { ...authRequestOptions, signal, body });
  return authUserResponseSchema.parse(payload).user;
}

export async function accountAction(path: string, body: Record<string, string>, signal: AbortSignal) {
  const payload = await requestAccountJson(`/api/auth/${path}`, { ...authRequestOptions, signal, body });
  return authMessageResponseSchema.parse(payload).message;
}
