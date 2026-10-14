import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { User } from './User.js';

@Entity({ tableName: 'auth_sessions' })
export class AuthSession {
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
