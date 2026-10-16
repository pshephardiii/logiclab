import type { AuthSessionFields } from '../types/auth-session/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { User } from './User.ts';

@Entity({ tableName: 'auth_sessions' })
export class AuthSession implements AuthSessionFields {
  // Hash of the opaque cookie; never the raw session ID.
  @PrimaryKey({ type: 'string', length: 64 })
  id!: string;

  @ManyToOne(() => User, {
    fieldName: 'user_id',
    foreignKeyName: 'auth_sessions_user_id_fkey',
    deleteRule: 'cascade',
  })
  user!: User;

  @Property({ type: 'text', fieldName: 'encrypted_tokens' })
  encryptedTokens!: string;

  @Property({ type: 'datetime', columnType: 'timestamptz', fieldName: 'access_expires_at' })
  accessExpiresAt!: Date;

  @Property({ type: 'datetime', columnType: 'timestamptz', fieldName: 'expires_at', index: true })
  expiresAt!: Date;
}

// Keep the readable field reference exact, excluding ORM creation metadata.
type AuthSessionFieldsCheck = Assert<SameEntityFields<AuthSession, AuthSessionFields>>;
