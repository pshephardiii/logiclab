import { randomUUID } from 'node:crypto';
import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export enum UserRole {
  Student = 'student',
  Instructor = 'instructor',
}

export const User = defineEntity({
  name: 'User',
  tableName: 'users',
  properties: {
    id: p.uuid().primary().onCreate(() => randomUUID()).defaultRaw('gen_random_uuid()'),
    cognitoUserPoolId: p.text().fieldName('cognito_user_pool_id'),
    cognitoSubject: p.text().fieldName('cognito_subject'),
    role: p.enum(() => UserRole).nativeEnumName('user_role'),
    email: p.text().nullable(),
    createdAt: p.datetime().columnType('timestamptz').fieldName('created_at').onCreate(() => new Date()).defaultRaw('now()'),
  },
  uniques: [
    { name: 'users_cognito_identity_unique', properties: ['cognitoUserPoolId', 'cognitoSubject'] },
    { name: 'users_pool_email_unique', properties: ['cognitoUserPoolId', 'email'] },
  ],
});

export type User = InferEntity<typeof User>;
