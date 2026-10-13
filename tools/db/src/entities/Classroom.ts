import { randomUUID } from 'node:crypto';
import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { User } from './User.js';

export const Classroom = defineEntity({
  name: 'Classroom',
  tableName: 'classrooms',
  properties: {
    id: p.uuid().primary().onCreate(() => randomUUID()).defaultRaw('gen_random_uuid()'),
    name: p.string().length(120),
    owner: p.manyToOne(User).fieldName('owner_id').foreignKeyName('classrooms_owner_id_fkey').deleteRule('restrict'),
    createdAt: p.datetime().columnType('timestamptz').fieldName('created_at').onCreate(() => new Date()).defaultRaw('now()'),
  },
  indexes: [{ name: 'classrooms_owner_id_index', properties: ['owner'] }],
});

export type Classroom = InferEntity<typeof Classroom>;
