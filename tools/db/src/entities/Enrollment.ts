import type { EnrollmentFields } from '../types/enrollment/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/es';
import { User } from './User.ts';
import { Classroom } from './Classroom.ts';

@Entity({ tableName: 'enrollments' })
@Unique({ name: 'enrollments_classroom_student_unique', properties: ['classroom', 'student'] })
@Index({ name: 'enrollments_student_id_index', properties: ['student'] })
export class Enrollment implements EnrollmentFields {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => Classroom, {
    fieldName: 'classroom_id',
    foreignKeyName: 'enrollments_classroom_id_fkey',
    deleteRule: 'cascade',
  })
  classroom!: Classroom;

  @ManyToOne(() => User, {
    fieldName: 'student_id',
    foreignKeyName: 'enrollments_student_id_fkey',
    deleteRule: 'cascade',
  })
  student!: User;

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
type EnrollmentFieldsCheck = Assert<SameEntityFields<Enrollment, EnrollmentFields>>;
