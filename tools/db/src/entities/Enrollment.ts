import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/es';
import { User } from './User.js';
import { Classroom } from './Classroom.js';

@Entity({ tableName: 'enrollments' })
@Unique({ name: 'enrollments_classroom_student_unique', properties: ['classroom', 'student'] })
@Index({ name: 'enrollments_student_id_index', properties: ['student'] })
export class Enrollment {
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
