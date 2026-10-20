import type { UserFields } from '../types/user/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import {
  Check,
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/es';

import { DemoWorkspace } from './DemoWorkspace.ts';
import { UserRole, UserIdentityProvider } from '../types/user/enums.ts';

// Preserve the existing entity-module export for current consumers.
export { UserRole } from '../types/user/enums.ts';

@Entity({ tableName: 'users' })
@Unique({ name: 'users_demo_workspace_role_unique', properties: ['demoWorkspace', 'role'] })
@Check({
  name: 'users_identity_check',
  expression: `
      (identity_provider = 'cognito'
        and cognito_user_pool_id is not null
        and cognito_subject is not null
        and demo_workspace_id is null)
      or (identity_provider = 'demo'
        and cognito_user_pool_id is null
        and cognito_subject is null
        and email is null
        and demo_workspace_id is not null)
    `,
})
@Unique({
  name: 'users_cognito_identity_unique',
  properties: ['cognitoUserPoolId', 'cognitoSubject'],
})
@Unique({ name: 'users_pool_email_unique', properties: ['cognitoUserPoolId', 'email'] })
export class User implements UserFields {
  [OptionalProps]?: 'id' | 'createdAt' | 'identityProvider';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({
    type: 'string',
    fieldName: 'identity_provider',
    length: 16,
    default: UserIdentityProvider.Cognito,
  })
  identityProvider: UserIdentityProvider = UserIdentityProvider.Cognito;

  @Property({ type: 'text', fieldName: 'cognito_user_pool_id', nullable: true })
  cognitoUserPoolId?: string;

  @Property({ type: 'text', fieldName: 'cognito_subject', nullable: true })
  cognitoSubject?: string;

  @ManyToOne(() => DemoWorkspace, {
    fieldName: 'demo_workspace_id',
    foreignKeyName: 'users_demo_workspace_id_fkey',
    nullable: true,
    deleteRule: 'restrict',
  })
  demoWorkspace?: DemoWorkspace;

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
