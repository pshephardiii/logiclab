import { randomUUID } from 'node:crypto';
import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { User } from './User.js';
import { Classroom } from './Classroom.js';
export const Enrollment = defineEntity({
  name: 'Enrollment', tableName: 'enrollments',
  properties: {
    id: p.uuid().primary().onCreate(() => randomUUID()).defaultRaw('gen_random_uuid()'),
    classroom: p.manyToOne(Classroom).fieldName('classroom_id').foreignKeyName('enrollments_classroom_id_fkey').deleteRule('cascade'),
    student: p.manyToOne(User).fieldName('student_id').foreignKeyName('enrollments_student_id_fkey').deleteRule('cascade'),
    createdAt: p.datetime().columnType('timestamptz').fieldName('created_at').onCreate(() => new Date()).defaultRaw('now()'),
  },
  uniques: [{ name: 'enrollments_classroom_student_unique', properties: ['classroom', 'student'] }],
  indexes: [{ name: 'enrollments_student_id_index', properties: ['student'] }],
});
export type Enrollment = InferEntity<typeof Enrollment>;
