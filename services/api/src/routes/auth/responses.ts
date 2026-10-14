import { authMessageResponseSchema, authUserResponseSchema } from '@logiclab/contracts';
import type { AppUser } from '../../application/auth/types';

export const message = (value: string) => authMessageResponseSchema.parse({ message: value });
/** Expose only the application identity and role in account responses. */
export const publicUser = (user: AppUser) => authUserResponseSchema.parse({
  user: { id: user.id, role: user.role },
});
