import type { ZodType } from 'zod';
import { AuthError } from '../../application/auth/service';

/** Validate body, query, or path data while preserving existing INVALID_REQUEST error mapping. */
export function parseRequest<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AuthError('INVALID_REQUEST');
  return parsed.data;
}
