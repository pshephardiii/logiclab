import { EntitySchema } from '@mikro-orm/core';
import { User } from './User.js';

export class AuthSession {
  id!: string; // SHA-256 hash of a random opaque cookie, never the raw session ID.
  user!: User;
  encryptedTokens!: string;
  accessExpiresAt!: Date;
  expiresAt!: Date;
}
export const AuthSessionSchema = new EntitySchema<AuthSession>({
  class: AuthSession,
  tableName: 'auth_sessions',
  properties: {
    id: { type: 'string', length: 64, primary: true },
    user: { kind: 'm:1', entity: () => User, fieldName: 'user_id', foreignKeyName: 'auth_sessions_user_id_fkey', deleteRule: 'cascade' },
    encryptedTokens: { type: 'text', fieldName: 'encrypted_tokens' },
    accessExpiresAt: { type: 'datetime', columnType: 'timestamptz', fieldName: 'access_expires_at' },
    expiresAt: { type: 'datetime', columnType: 'timestamptz', fieldName: 'expires_at', index: true },
  },
});
