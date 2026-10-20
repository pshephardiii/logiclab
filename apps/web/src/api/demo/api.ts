import { demoSessionResponseSchema, demoMessageResponseSchema } from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';
import { AccountApiError } from '../errors';
export type { DemoSessionResponse } from '@logiclab/contracts';

export async function loadDemoSession(signal: AbortSignal) {
  try {
    return await requestAccountJson('/api/demo/session', {
      signal,
      schema: demoSessionResponseSchema,
      fallback: 'Could not check your demo session.',
    });
  } catch (error) {
    if (error instanceof AccountApiError && (error.status === 401 || error.status === 404))
      return null;
    throw error;
  }
}
export function demoAction(
  action: 'start' | 'role' | 'reset',
  signal: AbortSignal,
  role?: 'student' | 'instructor',
) {
  return requestAccountJson(`/api/demo/${action}`, {
    signal,
    body: role ? { role } : {},
    schema: demoSessionResponseSchema,
    fallback: 'Could not update the demo. Please try again.',
    errorOverride: (status) =>
      status === 404
        ? new AccountApiError(
            'Demo mode is not enabled on this server. You can still use anonymous practice.',
            status,
          )
        : undefined,
  });
}
export function endDemo(signal: AbortSignal) {
  return requestAccountJson('/api/demo/logout', {
    signal,
    body: {},
    schema: demoMessageResponseSchema,
    fallback: 'Could not end the demo. Please try again.',
  });
}
