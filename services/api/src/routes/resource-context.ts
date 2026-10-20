import type { Role } from '../application/auth/types';
import type { CookieConfig } from './auth/cookies';

/** Resource authorization needs an application user, not Cognito provider credentials. */
export type ResourceUser = { id: string; role: Role };
export type ResourceContext = {
  config: CookieConfig;
  service: { authenticate(id: string): Promise<ResourceUser> };
};
