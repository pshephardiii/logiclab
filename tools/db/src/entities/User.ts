import { randomUUID } from 'node:crypto';
import { EntitySchema, OptionalProps } from '@mikro-orm/core';

export enum UserRole {
  Student = 'student',
  Instructor = 'instructor',
}

export class User {
  [OptionalProps]?: 'id' | 'createdAt';
  id = randomUUID();
  cognitoUserPoolId!: string;
  cognitoSubject!: string;
  role!: UserRole;
  createdAt = new Date();
}

export const UserSchema = new EntitySchema<User>({
  class: User,
  tableName: 'users',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    cognitoUserPoolId: { type: 'text', fieldName: 'cognito_user_pool_id' },
    cognitoSubject: { type: 'text', fieldName: 'cognito_subject' },
    role: { enum: true, items: () => UserRole, nativeEnumName: 'user_role' },
    createdAt: { type: 'datetime', columnType: 'timestamptz', fieldName: 'created_at', defaultRaw: 'now()' },
  },
  uniques: [{ name: 'users_cognito_identity_unique', properties: ['cognitoUserPoolId', 'cognitoSubject'] }],
});
