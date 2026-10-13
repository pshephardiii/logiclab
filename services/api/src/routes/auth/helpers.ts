import type { ZodType } from 'zod';
import { authMessageResponseSchema, authUserResponseSchema } from '@logiclab/contracts';
import { AuthError } from '../../application/auth/service';
import type { AppUser } from '../../application/auth/types';

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AuthError('INVALID_REQUEST');
  return parsed.data;
}
export const message = (value: string) => authMessageResponseSchema.parse({ message: value });
export const publicUser = (user: AppUser) => authUserResponseSchema.parse({ user: { id: user.id, role: user.role } });
export const errorName = (error: unknown) => error instanceof Error ? error.name : '';
export const hiddenAccountErrors = new Set(['UserNotFoundException', 'NotAuthorizedException', 'InvalidParameterException', 'UsernameExistsException']);
