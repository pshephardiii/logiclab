import { authErrorResponseSchema } from '@logiclab/contracts';

export class AccountApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function accountApiError(
  status: number,
  payload: unknown,
  fallback: string,
): AccountApiError {
  const parsed = authErrorResponseSchema.safeParse(payload);
  return new AccountApiError(parsed.success ? parsed.data.error.message : fallback, status);
}
