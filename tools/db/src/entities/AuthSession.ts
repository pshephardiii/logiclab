import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { User } from './User.js';

export const AuthSession = defineEntity({
  name: 'AuthSession',
  tableName: 'auth_sessions',
  properties: {
    id: p.string().length(64).primary(), // Hash of the opaque cookie; never the raw session ID.
    user: p.manyToOne(User).fieldName('user_id').foreignKeyName('auth_sessions_user_id_fkey').deleteRule('cascade'),
    encryptedTokens: p.text().fieldName('encrypted_tokens'),
    accessExpiresAt: p.datetime().columnType('timestamptz').fieldName('access_expires_at'),
    expiresAt: p.datetime().columnType('timestamptz').fieldName('expires_at').index(),
  },
});

export type AuthSession = InferEntity<typeof AuthSession>;
