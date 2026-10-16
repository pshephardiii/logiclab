import type { UserFields } from '../types/user/fields.js';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.js';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/es';

import { UserRole } from '../types/user/enums.js';

// Preserve the existing entity-module export for current consumers.
export { UserRole } from '../types/user/enums.js';

@Entity({ tableName: 'users' })
@Unique({
  name: 'users_cognito_identity_unique',
  properties: ['cognitoUserPoolId', 'cognitoSubject'],
})
@Unique({ name: 'users_pool_email_unique', properties: ['cognitoUserPoolId', 'email'] })
export class User implements UserFields {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'text', fieldName: 'cognito_user_pool_id' })
  cognitoUserPoolId!: string;

  @Property({ type: 'text', fieldName: 'cognito_subject' })
  cognitoSubject!: string;

  @Enum({ items: () => UserRole, nativeEnumName: 'user_role' })
  role!: UserRole;

  @Property({ type: 'text', nullable: true })
  email?: string;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'created_at',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt = new Date();
}

// Keep the readable field reference exact, excluding ORM creation metadata.
type UserFieldsCheck = Assert<SameEntityFields<User, UserFields>>;
