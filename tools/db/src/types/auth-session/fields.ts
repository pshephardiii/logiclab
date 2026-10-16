import type { User } from '../../entities/User.ts';

/** Readable field reference checked against the decorated AuthSession entity. */
export interface AuthSessionFields {
  id: string;
  user: User;
  encryptedTokens: string;
  accessExpiresAt: Date;
  expiresAt: Date;
}
